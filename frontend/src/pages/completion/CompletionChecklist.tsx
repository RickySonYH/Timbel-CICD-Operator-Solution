// [advice from AI] 소프트웨어 솔루션 개발 완료 체크리스트 시스템
// Phase 4: 완료 및 인수인계 시스템의 핵심 기능

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Alert,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Code as CodeIcon,
  Security as SecurityIcon,
  Speed as PerformanceIcon,
  BugReport as BugReportIcon,
  DocumentScanner as DocumentScannerIcon
} from '@mui/icons-material';

interface ChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  criteria: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  evidence: string[];
  reviewer: string;
  reviewed_at: string;
  notes: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
  completion_percentage: number;
  checklist_items: ChecklistItem[];
}

const CompletionChecklist: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // 다이얼로그 상태
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [evidenceDialog, setEvidenceDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ChecklistItem | null>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    criteria: [] as string[],
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    evidence: [] as string[],
    notes: ''
  });

  // [advice from AI] 소프트웨어 솔루션 개발 표준 체크리스트 템플릿
  const standardChecklistTemplate: ChecklistItem[] = [
    // 1. 기능 요구사항 검증
    {
      id: 'func-001',
      category: '기능 요구사항',
      title: '기능 명세서 준수 검증',
      description: '개발된 기능이 요구사항 명세서에 명시된 모든 기능을 정확히 구현했는지 검증',
      criteria: [
        '모든 기능이 명세서대로 구현됨',
        '입력/출력 데이터 형식이 명세와 일치함',
        '에러 처리 로직이 명세에 따라 구현됨',
        '사용자 인터페이스가 명세와 일치함'
      ],
      priority: 'critical',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },
    {
      id: 'func-002',
      category: '기능 요구사항',
      title: '사용자 시나리오 테스트',
      description: '주요 사용자 시나리오가 정상적으로 동작하는지 검증',
      criteria: [
        '로그인/로그아웃 시나리오 정상 동작',
        '주요 비즈니스 플로우 정상 동작',
        '데이터 CRUD 작업 정상 동작',
        '권한별 접근 제어 정상 동작'
      ],
      priority: 'critical',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },

    // 2. 코드 품질 검증
    {
      id: 'code-001',
      category: '코드 품질',
      title: '코드 리뷰 완료',
      description: '코드 리뷰가 완료되고 모든 코멘트가 해결되었는지 확인',
      criteria: [
        '최소 2명 이상의 리뷰어가 승인',
        '모든 리뷰 코멘트가 해결됨',
        '코딩 표준을 준수함',
        '적절한 주석이 작성됨'
      ],
      priority: 'high',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },
    {
      id: 'code-002',
      category: '코드 품질',
      title: '정적 분석 도구 검사',
      description: 'SonarQube, ESLint 등 정적 분석 도구를 통한 코드 품질 검사',
      criteria: [
        '코드 커버리지 80% 이상',
        '중복 코드 3% 이하',
        '복잡도(Cyclomatic Complexity) 10 이하',
        '보안 취약점 0개'
      ],
      priority: 'high',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },

    // 3. 보안 검증
    {
      id: 'security-001',
      category: '보안',
      title: 'OWASP Top 10 보안 검사',
      description: 'OWASP Top 10 보안 취약점에 대한 검사 완료',
      criteria: [
        'SQL Injection 방어 구현',
        'XSS(Cross-Site Scripting) 방어 구현',
        'CSRF(Cross-Site Request Forgery) 방어 구현',
        '인증/인가 취약점 없음',
        '민감한 데이터 암호화 저장'
      ],
      priority: 'critical',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },
    {
      id: 'security-002',
      category: '보안',
      title: '데이터 보호 및 개인정보보호',
      description: '개인정보보호법 및 데이터 보호 규정 준수 검증',
      criteria: [
        '개인정보 수집/이용 동의 절차 구현',
        '개인정보 암호화 저장',
        '데이터 접근 로그 기록',
        '개인정보 삭제 기능 구현'
      ],
      priority: 'critical',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },

    // 4. 성능 검증
    {
      id: 'perf-001',
      category: '성능',
      title: '응답 시간 성능 테스트',
      description: '시스템 응답 시간이 요구사항을 만족하는지 검증',
      criteria: [
        'API 응답 시간 1초 이하',
        '페이지 로딩 시간 3초 이하',
        '동시 사용자 100명 이상 지원',
        '데이터베이스 쿼리 최적화 완료'
      ],
      priority: 'high',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },
    {
      id: 'perf-002',
      category: '성능',
      title: '부하 테스트 완료',
      description: '예상 사용자 수에 대한 부하 테스트 수행',
      criteria: [
        '정상 동작 사용자 수 확인',
        '시스템 리소스 사용률 모니터링',
        '메모리 누수 없음',
        '데이터베이스 연결 풀 최적화'
      ],
      priority: 'high',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },

    // 5. 호환성 검증
    {
      id: 'compat-001',
      category: '호환성',
      title: '브라우저 호환성 테스트',
      description: '주요 브라우저에서 정상 동작하는지 검증',
      criteria: [
        'Chrome 최신 버전 정상 동작',
        'Firefox 최신 버전 정상 동작',
        'Safari 최신 버전 정상 동작',
        'Edge 최신 버전 정상 동작',
        '모바일 브라우저 정상 동작'
      ],
      priority: 'medium',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },
    {
      id: 'compat-002',
      category: '호환성',
      title: '운영체제 호환성 테스트',
      description: '다양한 운영체제에서 정상 동작하는지 검증',
      criteria: [
        'Windows 10/11 정상 동작',
        'macOS 최신 버전 정상 동작',
        'Linux Ubuntu 정상 동작',
        '모바일 iOS/Android 정상 동작'
      ],
      priority: 'medium',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },

    // 6. 사용성 검증
    {
      id: 'usability-001',
      category: '사용성',
      title: '사용자 인터페이스 검증',
      description: '사용자 인터페이스의 직관성과 사용성 검증',
      criteria: [
        '직관적인 네비게이션 구조',
        '일관된 UI/UX 디자인',
        '접근성 가이드라인 준수',
        '반응형 디자인 구현',
        '에러 메시지 명확성'
      ],
      priority: 'medium',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },

    // 7. 문서화 검증
    {
      id: 'doc-001',
      category: '문서화',
      title: '기술 문서 완성도',
      description: '개발 관련 기술 문서의 완성도 검증',
      criteria: [
        'API 문서 완성 (Swagger/OpenAPI)',
        '데이터베이스 스키마 문서 완성',
        '설치/배포 가이드 완성',
        '운영 매뉴얼 완성',
        '사용자 매뉴얼 완성'
      ],
      priority: 'high',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },

    // 8. 배포 준비 검증
    {
      id: 'deploy-001',
      category: '배포 준비',
      title: 'CI/CD 파이프라인 구축',
      description: '지속적 통합/배포 파이프라인 구축 완료',
      criteria: [
        '자동 빌드 파이프라인 구축',
        '자동 테스트 실행 파이프라인 구축',
        '자동 배포 파이프라인 구축',
        '환경별 설정 관리 완료',
        '롤백 절차 준비 완료'
      ],
      priority: 'high',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    },
    {
      id: 'deploy-002',
      category: '배포 준비',
      title: '모니터링 및 로깅 구축',
      description: '운영 환경 모니터링 및 로깅 시스템 구축',
      criteria: [
        '애플리케이션 모니터링 구축',
        '인프라 모니터링 구축',
        '로그 수집 및 분석 시스템 구축',
        '알림 시스템 구축',
        '성능 지표 대시보드 구축'
      ],
      priority: 'high',
      status: 'pending',
      evidence: [],
      reviewer: '',
      reviewed_at: '',
      notes: ''
    }
  ];

  // [advice from AI] 데이터 로드 함수들
  const loadProjects = async () => {
    try {
      setIsLoading(true);
      // 실제로는 API에서 데이터를 가져와야 함
      // 임시로 하드코딩된 데이터 사용
      const mockProjects: Project[] = [
        {
          id: 'proj-001',
          name: 'Timbel Knowledge Platform',
          status: 'in_progress',
          completion_percentage: 75,
          checklist_items: standardChecklistTemplate
        }
      ];
      setProjects(mockProjects);
    } catch (error) {
      console.error('프로젝트 데이터 로드 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // [advice from AI] 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadProjects();
  }, []);

  // [advice from AI] 상태별 색상
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'in_progress': return 'warning';
      case 'completed': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case '기능 요구사항': return <AssignmentIcon />;
      case '코드 품질': return <CodeIcon />;
      case '보안': return <SecurityIcon />;
      case '성능': return <PerformanceIcon />;
      case '호환성': return <CheckCircleIcon />;
      case '사용성': return <InfoIcon />;
      case '문서화': return <DocumentScannerIcon />;
      case '배포 준비': return <UploadIcon />;
      default: return <AssignmentIcon />;
    }
  };

  // [advice from AI] 체크리스트 항목 상태 변경
  const handleStatusChange = async (itemId: string, newStatus: string) => {
    try {
      // 실제로는 API 호출
      console.log('상태 변경:', itemId, newStatus);
    } catch (error) {
      console.error('상태 변경 중 오류:', error);
    }
  };

  // [advice from AI] 증거 자료 추가
  const handleAddEvidence = async (itemId: string, evidence: string) => {
    try {
      // 실제로는 API 호출
      console.log('증거 자료 추가:', itemId, evidence);
    } catch (error) {
      console.error('증거 자료 추가 중 오류:', error);
    }
  };

  // [advice from AI] 체크리스트 항목 수정
  const handleEditItem = (item: ChecklistItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      title: item.title,
      description: item.description,
      criteria: item.criteria,
      priority: item.priority,
      evidence: item.evidence,
      notes: item.notes
    });
    setItemDialog(true);
  };

  // [advice from AI] 체크리스트 항목 상세 보기
  const handleViewItem = (item: ChecklistItem) => {
    setSelectedItem(item);
  };

  // [advice from AI] 증거 자료 다이얼로그 열기
  const handleOpenEvidenceDialog = (item: ChecklistItem) => {
    setSelectedItem(item);
    setEvidenceDialog(true);
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography sx={{ mt: 2 }}>데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <CheckCircleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          완료 체크리스트
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          sx={{ bgcolor: 'primary.main' }}
        >
          체크리스트 내보내기
        </Button>
      </Box>

      {/* 프로젝트 선택 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>프로젝트 선택</InputLabel>
              <Select
                value={selectedProject?.id || ''}
                onChange={(e) => {
                  const project = projects.find(p => p.id === e.target.value);
                  setSelectedProject(project || null);
                }}
                label="프로젝트 선택"
              >
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2" color="textSecondary">
              완료율: {selectedProject?.completion_percentage || 0}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={selectedProject?.completion_percentage || 0}
              sx={{ mt: 1 }}
            />
          </Grid>
        </Grid>
      </Paper>

      {selectedProject && (
        <>
          {/* 필터 */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>카테고리</InputLabel>
                  <Select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    label="카테고리"
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="기능 요구사항">기능 요구사항</MenuItem>
                    <MenuItem value="코드 품질">코드 품질</MenuItem>
                    <MenuItem value="보안">보안</MenuItem>
                    <MenuItem value="성능">성능</MenuItem>
                    <MenuItem value="호환성">호환성</MenuItem>
                    <MenuItem value="사용성">사용성</MenuItem>
                    <MenuItem value="문서화">문서화</MenuItem>
                    <MenuItem value="배포 준비">배포 준비</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="상태"
                  >
                    <MenuItem value="all">전체</MenuItem>
                    <MenuItem value="pending">대기</MenuItem>
                    <MenuItem value="in_progress">진행중</MenuItem>
                    <MenuItem value="completed">완료</MenuItem>
                    <MenuItem value="failed">실패</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* 체크리스트 항목들 */}
          <Grid container spacing={3}>
            {selectedProject.checklist_items
              .filter(item => 
                (filterCategory === 'all' || item.category === filterCategory) &&
                (filterStatus === 'all' || item.status === filterStatus)
              )
              .map((item) => (
                <Grid item xs={12} key={item.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          {getCategoryIcon(item.category)}
                          <Box sx={{ ml: 2, flex: 1 }}>
                            <Typography variant="h6" gutterBottom>
                              {item.title}
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                              {item.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                              <Chip
                                label={item.category}
                                size="small"
                                variant="outlined"
                              />
                              <Chip
                                label={item.priority}
                                color={getPriorityColor(item.priority)}
                                size="small"
                              />
                              <Chip
                                label={item.status}
                                color={getStatusColor(item.status)}
                                size="small"
                              />
                            </Box>
                          </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="상세 보기">
                            <IconButton
                              size="small"
                              onClick={() => handleViewItem(item)}
                            >
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="수정">
                            <IconButton
                              size="small"
                              onClick={() => handleEditItem(item)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      {/* 평가 기준 */}
                      <Typography variant="subtitle2" gutterBottom>
                        평가 기준:
                      </Typography>
                      <List dense>
                        {item.criteria.map((criterion, index) => (
                          <ListItem key={index} sx={{ py: 0 }}>
                            <ListItemIcon>
                              <CheckCircleIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={criterion}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>

                      {/* 증거 자료 */}
                      {item.evidence.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            증거 자료:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {item.evidence.map((evidence, index) => (
                              <Chip
                                key={index}
                                label={evidence}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>
                      )}

                      {/* 액션 버튼 */}
                      <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleStatusChange(item.id, 'in_progress')}
                          disabled={item.status === 'completed'}
                        >
                          시작
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          onClick={() => handleStatusChange(item.id, 'completed')}
                          disabled={item.status === 'completed'}
                        >
                          완료
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenEvidenceDialog(item)}
                        >
                          증거 추가
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
          </Grid>
        </>
      )}

      {/* 체크리스트 항목 상세 다이얼로그 */}
      <Dialog
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedItem?.title}
        </DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                카테고리: {selectedItem.category}
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                우선순위: 
                <Chip
                  label={selectedItem.priority}
                  color={getPriorityColor(selectedItem.priority)}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              <Typography variant="subtitle2" gutterBottom>
                상태: 
                <Chip
                  label={selectedItem.status}
                  color={getStatusColor(selectedItem.status)}
                  size="small"
                  sx={{ ml: 1 }}
                />
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                설명
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {selectedItem.description}
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                평가 기준
              </Typography>
              <List dense>
                {selectedItem.criteria.map((criterion, index) => (
                  <ListItem key={index} sx={{ py: 0 }}>
                    <ListItemIcon>
                      <CheckCircleIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={criterion}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
              
              {selectedItem.evidence.length > 0 && (
                <>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    증거 자료
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedItem.evidence.map((evidence, index) => (
                      <Chip
                        key={index}
                        label={evidence}
                        size="small"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                </>
              )}
              
              {selectedItem.notes && (
                <>
                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                    메모
                  </Typography>
                  <Typography variant="body2">
                    {selectedItem.notes}
                  </Typography>
                </>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedItem(null)}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 증거 자료 추가 다이얼로그 */}
      <Dialog
        open={evidenceDialog}
        onClose={() => setEvidenceDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          증거 자료 추가
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="증거 자료 URL 또는 설명"
            multiline
            rows={3}
            sx={{ mt: 2 }}
            placeholder="예: 테스트 결과 스크린샷 URL, 코드 리뷰 링크, 성능 테스트 리포트 등"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEvidenceDialog(false)}>
            취소
          </Button>
          <Button variant="contained">
            추가
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CompletionChecklist;
