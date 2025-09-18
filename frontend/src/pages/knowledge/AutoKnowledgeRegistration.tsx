// [advice from AI] 지식 자산 자동 등록 페이지 - GitHub 레포지토리 및 외부 서비스 기반 자동 추출

import React, { useState } from 'react';
import {
  Container, Typography, Box, Card, CardContent, Grid,
  TextField, Button, Select, MenuItem, FormControl, InputLabel,
  Stepper, Step, StepLabel, StepContent, Alert, CircularProgress,
  List, ListItem, ListItemIcon, ListItemText, ListItemSecondaryAction,
  Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  LinearProgress, Accordion, AccordionSummary, AccordionDetails,
  Switch, FormControlLabel, Divider
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  Link as LinkIcon,
  CloudDownload as DownloadIcon,
  AutoAwesome as AutoIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  Folder as FolderIcon,
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  Category as ComponentIcon
} from '@mui/icons-material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';
import ApprovalRequestForm from '../../components/approvals/ApprovalRequestForm';

interface SourceRepository {
  type: 'github' | 'gitlab' | 'bitbucket' | 'url';
  url: string;
  branch?: string;
  accessToken?: string;
  includePrivate?: boolean;
}

interface ExtractionOptions {
  extractCode: boolean;
  extractDocuments: boolean;
  extractDesignAssets: boolean;
  extractCatalogComponents: boolean;
  generateDiagrams: boolean;
  mapRelationships: boolean;
  generateDocumentation: boolean;
  defaultOwner: string;
  targetDepartment?: string;
}

interface ExtractionProgress {
  step: string;
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  message: string;
  details?: any;
}

interface ExtractionResult {
  success: boolean;
  summary: {
    codeComponents: number;
    designAssets: number;
    documents: number;
    catalogComponents: number;
    diagrams: number;
    relationships: number;
  };
  errors: string[];
  warnings: string[];
  extractedAssets: any[];
}

const AutoKnowledgeRegistration: React.FC = () => {
  const { token, user } = useJwtAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [sourceRepo, setSourceRepo] = useState<SourceRepository>({
    type: 'github',
    url: '',
    branch: 'main'
  });
  const [extractionOptions, setExtractionOptions] = useState<ExtractionOptions>({
    extractCode: true,
    extractDocuments: true,
    extractDesignAssets: true,
    extractCatalogComponents: true,
    generateDiagrams: true,
    mapRelationships: true,
    generateDocumentation: true,
    defaultOwner: user?.fullName || 'RickySon'
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress[]>([]);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [isFetchingBranches, setIsFetchingBranches] = useState(false);
  const [systemInfo, setSystemInfo] = useState({
    name: '',
    description: '',
    category: 'application', // application, service, library, tool
    version: '1.0.0',
    domainId: '' // [advice from AI] 도메인 선택 추가
  });
  const [approvalStrategy, setApprovalStrategy] = useState<'system-first' | 'direct-individual'>('system-first');

  // [advice from AI] 소스 URL 검증
  const validateSourceUrl = (url: string, type: string): boolean => {
    const patterns = {
      github: /^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+/,
      gitlab: /^https:\/\/gitlab\.com\/[\w\-\.]+\/[\w\-\.]+/,
      bitbucket: /^https:\/\/bitbucket\.org\/[\w\-\.]+\/[\w\-\.]+/,
      url: /^https?:\/\/.+/
    };
    return patterns[type as keyof typeof patterns]?.test(url) || false;
  };

  // [advice from AI] GitHub 브랜치 목록 가져오기
  const fetchGitHubBranches = async (repoUrl: string) => {
    try {
      setIsFetchingBranches(true);
      setError(null);
      
      // GitHub URL에서 owner/repo 추출
      const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!match) {
        throw new Error('유효하지 않은 GitHub URL입니다');
      }
      
      const [, owner, repo] = match;
      const cleanRepo = repo.replace(/\.git$/, ''); // .git 확장자 제거
      
      // GitHub API 호출
      const response = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/branches`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('레포지토리를 찾을 수 없습니다. 공개 레포지토리인지 확인해주세요.');
        }
        throw new Error(`GitHub API 오류: ${response.status}`);
      }
      
      const branches = await response.json();
      const branchNames = branches.map((branch: any) => branch.name);
      
      setAvailableBranches(branchNames);
      
      // 기본 브랜치 설정 (main 또는 master 우선)
      if (branchNames.includes('main')) {
        setSelectedBranch('main');
      } else if (branchNames.includes('master')) {
        setSelectedBranch('master');
      } else if (branchNames.length > 0) {
        setSelectedBranch(branchNames[0]);
      }
      
    } catch (error) {
      console.error('브랜치 정보 가져오기 실패:', error);
      setError(error instanceof Error ? error.message : '브랜치 정보를 가져올 수 없습니다');
      setAvailableBranches([]);
    } finally {
      setIsFetchingBranches(false);
    }
  };

  // [advice from AI] 자동 추출 시작
  const handleStartExtraction = async () => {
    if (!validateSourceUrl(sourceRepo.url, sourceRepo.type)) {
      setError(`유효하지 않은 ${sourceRepo.type.toUpperCase()} URL입니다.`);
      return;
    }

    if (!systemInfo.name.trim()) {
      setError('시스템명을 입력해주세요.');
      return;
    }

    if (!systemInfo.description.trim()) {
      setError('시스템 설명을 입력해주세요.');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractionProgress([]);
    setActiveStep(2);

    try {
      console.log('🚀 자동 지식 추출 시작:', { sourceRepo, extractionOptions });

      const response = await fetch('http://localhost:3001/api/knowledge-extraction/extract-from-source', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: {
            ...sourceRepo,
            branch: selectedBranch
          },
          options: extractionOptions,
          system: systemInfo,
          approvalStrategy: approvalStrategy
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // [advice from AI] 디버깅을 위한 상세 로그 추가
      console.log('📋 서버 응답 상태:', response.status, response.statusText);
      console.log('📋 서버 응답 성공:', result.success);
      console.log('📋 서버 응답 메시지:', result.message);
      if (result.data) console.log('📋 서버 응답 데이터:', result.data);
      
      if (result.success) {
        setExtractionResult(result.data);
        setShowResultDialog(true);
        setActiveStep(3);
        console.log('✅ 자동 추출 완료 - 요약:', result.data?.summary || '요약 없음');
      } else {
        console.error('❌ 서버에서 실패 응답 - 메시지:', result.message || result.error);
        throw new Error(result.message || result.error || '추출 실패');
      }

    } catch (err) {
      console.error('❌ 자동 추출 실패:', err);
      
      // [advice from AI] 더 상세한 에러 메시지 제공
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch')) {
          errorMessage = '서버 연결에 실패했습니다. 네트워크 연결을 확인해주세요.';
        } else if (err.message.includes('401')) {
          errorMessage = '인증에 실패했습니다. 다시 로그인해주세요.';
        } else if (err.message.includes('403')) {
          errorMessage = '접근 권한이 없습니다.';
        } else if (err.message.includes('404')) {
          errorMessage = 'API 엔드포인트를 찾을 수 없습니다.';
        } else if (err.message.includes('500')) {
          errorMessage = '서버 내부 오류가 발생했습니다.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsExtracting(false);
    }
  };
  
  // [advice from AI] 승인 신청 처리
  const handleApprovalSubmit = async (approvalData: any) => {
    try {
      const response = await fetch('http://localhost:3001/api/approvals/create', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(approvalData)
      });
      
      if (response.ok) {
        setActiveStep(4); // 승인 신청 완료 단계로
        console.log('✅ 승인 신청 성공');
      } else {
        throw new Error('승인 신청 실패');
      }
    } catch (error) {
      console.error('❌ 승인 신청 오류:', error);
      setError('승인 신청 중 오류가 발생했습니다.');
    }
  };

  // [advice from AI] 진행 상황 실시간 업데이트 (WebSocket 또는 폴링)
  React.useEffect(() => {
    if (!isExtracting) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/knowledge-extraction/progress', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const progress = await response.json();
          if (progress.success) {
            setExtractionProgress(progress.data.steps || []);
          }
        }
      } catch (err) {
        console.error('진행 상황 조회 실패:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isExtracting, token]);

  // [advice from AI] 소스 타입별 아이콘
  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'github': return <GitHubIcon />;
      case 'gitlab': return <GitHubIcon />; // GitLab 아이콘이 없어서 GitHub 사용
      case 'bitbucket': return <GitHubIcon />; // Bitbucket 아이콘이 없어서 GitHub 사용
      case 'url': return <LinkIcon />;
      default: return <LinkIcon />;
    }
  };

  // [advice from AI] 추출 결과 요약 - 최대한 간단하게
  const renderExtractionSummary = () => {
    if (!extractionResult) {
      return <Alert severity="warning">추출 결과가 없습니다.</Alert>;
    }

    const summary = extractionResult.summary || {};
    const codeCount = Number(summary.codeComponents || 0);
    const docCount = Number(summary.documents || 0);
    const designCount = Number(summary.designAssets || 0);
    const catalogCount = Number(summary.catalogComponents || 0);
    const totalAssets = codeCount + docCount + designCount + catalogCount;

    return (
      <Box>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CodeIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4">{codeCount}</Typography>
                <Typography variant="body2">코드 컴포넌트</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <DocumentIcon color="secondary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4">{docCount}</Typography>
                <Typography variant="body2">문서</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ImageIcon color="success" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4">{designCount}</Typography>
                <Typography variant="body2">디자인 자산</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ComponentIcon color="warning" sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4">{catalogCount}</Typography>
                <Typography variant="body2">카탈로그</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Alert severity="success" sx={{ mt: 2 }}>
              총 {totalAssets}개의 지식 자산이 성공적으로 추출되었습니다!
            </Alert>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const steps = [
    '소스 설정',
    '추출 옵션',
    '자동 추출',
    '결과 확인'
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          지식 자산 자동 등록
        </Typography>
        <Typography variant="body1" color="text.secondary">
          GitHub 레포지토리나 외부 서비스에서 지식 자산을 자동으로 추출하고 등록합니다.
        </Typography>
      </Box>

      {/* 에러 메시지 */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 단계별 진행 */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* 1단계: 소스 설정 */}
            <Step>
              <StepLabel>소스 설정</StepLabel>
              <StepContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>소스 타입</InputLabel>
                      <Select
                        value={sourceRepo.type}
                        onChange={(e) => setSourceRepo({ ...sourceRepo, type: e.target.value as any })}
                        label="소스 타입"
                      >
                        <MenuItem value="github">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GitHubIcon /> GitHub
                          </Box>
                        </MenuItem>
                        <MenuItem value="gitlab">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GitHubIcon /> GitLab
                          </Box>
                        </MenuItem>
                        <MenuItem value="bitbucket">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GitHubIcon /> Bitbucket
                          </Box>
                        </MenuItem>
                        <MenuItem value="url">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinkIcon /> 일반 URL
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="레포지토리 URL"
                      value={sourceRepo.url}
                      onChange={(e) => {
                        const newUrl = e.target.value;
                        setSourceRepo({ ...sourceRepo, url: newUrl });
                        
                        // [advice from AI] GitHub URL 입력 완료 시 자동으로 브랜치 조회
                        if (sourceRepo.type === 'github' && validateSourceUrl(newUrl, 'github')) {
                          // 디바운스로 연속 입력 방지
                          clearTimeout(window.branchFetchTimeout);
                          window.branchFetchTimeout = setTimeout(() => {
                            fetchGitHubBranches(newUrl);
                          }, 1500);
                        } else {
                          // GitHub가 아니거나 유효하지 않으면 브랜치 목록 초기화
                          setAvailableBranches([]);
                          setSelectedBranch('main');
                        }
                      }}
                      placeholder={`https://${sourceRepo.type === 'github' ? 'github.com' : sourceRepo.type + '.com'}/username/repository`}
                      error={sourceRepo.url !== '' && !validateSourceUrl(sourceRepo.url, sourceRepo.type)}
                      helperText={sourceRepo.url !== '' && !validateSourceUrl(sourceRepo.url, sourceRepo.type) 
                        ? `유효하지 않은 ${sourceRepo.type.toUpperCase()} URL입니다.` 
                        : `${sourceRepo.type.toUpperCase()} 레포지토리 URL을 입력하세요.`}
                    />
                  </Grid>

                  {/* [advice from AI] 브랜치 선택 (GitHub만) */}
                  {sourceRepo.type === 'github' && availableBranches.length > 0 && (
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <InputLabel>브랜치</InputLabel>
                        <Select
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          label="브랜치"
                          disabled={isFetchingBranches}
                        >
                          {availableBranches.map((branch) => (
                            <MenuItem key={branch} value={branch}>
                              {branch}
                              {(branch === 'main' || branch === 'master') && (
                                <Chip 
                                  size="small" 
                                  label="기본" 
                                  sx={{ ml: 1, height: 20 }}
                                />
                              )}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}

                  {/* [advice from AI] 브랜치 로딩 표시 */}
                  {sourceRepo.type === 'github' && isFetchingBranches && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} />
                        <Typography variant="body2" color="text.secondary">
                          브랜치 정보를 가져오는 중...
                        </Typography>
                      </Box>
                    </Grid>
                  )}

                  {sourceRepo.type !== 'url' && (
                    <>
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="브랜치"
                          value={sourceRepo.branch}
                          onChange={(e) => setSourceRepo({ ...sourceRepo, branch: e.target.value })}
                          placeholder="main"
                        />
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <TextField
                          fullWidth
                          label="액세스 토큰 (선택사항)"
                          type="password"
                          value={sourceRepo.accessToken || ''}
                          onChange={(e) => setSourceRepo({ ...sourceRepo, accessToken: e.target.value })}
                          placeholder="Private 레포지토리 접근용"
                        />
                      </Grid>
                    </>
                  )}
                </Grid>

                <Box sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={() => setActiveStep(1)}
                    disabled={!validateSourceUrl(sourceRepo.url, sourceRepo.type)}
                    startIcon={getSourceIcon(sourceRepo.type)}
                  >
                    다음 단계
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* 2단계: 추출 옵션 */}
            <Step>
              <StepLabel>추출 옵션</StepLabel>
              <StepContent>
                {/* [advice from AI] 시스템 정보 설정 */}
                <Card sx={{ mb: 3, p: 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'primary.light' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                    <SettingsIcon />
                    시스템(솔루션) 정보
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth required>
                        <InputLabel>소속 도메인 (영업처)</InputLabel>
                        <Select
                          value={systemInfo.domainId || ''}
                          onChange={(e) => setSystemInfo({...systemInfo, domainId: e.target.value})}
                          label="소속 도메인 (영업처)"
                        >
                          <MenuItem value="d1000000-0000-0000-0000-000000000001">국민은행 (금융)</MenuItem>
                          <MenuItem value="d1000000-0000-0000-0000-000000000002">삼성전자 (제조)</MenuItem>
                          <MenuItem value="d1000000-0000-0000-0000-000000000003">롯데마트 (유통)</MenuItem>
                          <MenuItem value="323a2d46-e8aa-4f47-b6ab-88fdccdd5fed">금융서비스</MenuItem>
                          <MenuItem value="f16ab5f4-6ba6-441f-b188-858474805400">제조업</MenuItem>
                        </Select>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                          이 시스템이 속할 영업처/사업영역을 선택하세요
                        </Typography>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="시스템명"
                        value={systemInfo.name}
                        onChange={(e) => setSystemInfo({...systemInfo, name: e.target.value})}
                        placeholder="예: ECP AI K8s Orchestrator"
                        helperText="승인될 시스템의 공식 명칭을 입력하세요"
                        required
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <FormControl fullWidth>
                        <InputLabel>시스템 분류</InputLabel>
                        <Select
                          value={systemInfo.category}
                          onChange={(e) => setSystemInfo({...systemInfo, category: e.target.value})}
                          label="시스템 분류"
                        >
                          <MenuItem value="application">애플리케이션</MenuItem>
                          <MenuItem value="service">서비스</MenuItem>
                          <MenuItem value="library">라이브러리</MenuItem>
                          <MenuItem value="tool">도구</MenuItem>
                          <MenuItem value="platform">플랫폼</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="버전"
                        value={systemInfo.version}
                        onChange={(e) => setSystemInfo({...systemInfo, version: e.target.value})}
                        placeholder="1.0.0"
                      />
                    </Grid>
                    
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="시스템 설명"
                        value={systemInfo.description}
                        onChange={(e) => setSystemInfo({...systemInfo, description: e.target.value})}
                        placeholder="이 시스템의 목적, 주요 기능, 아키텍처 개요를 설명하세요"
                        helperText="승인자가 시스템을 이해할 수 있도록 상세히 작성해주세요"
                        required
                      />
                    </Grid>
                  </Grid>
                </Card>

                {/* [advice from AI] 승인 전략 선택 */}
                <Card sx={{ mb: 3, p: 2, bgcolor: 'warning.light', bgcolor: 'background.paper' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckIcon />
                    승인 전략
                  </Typography>
                  
                  <FormControl fullWidth>
                    <InputLabel>승인 방식</InputLabel>
                    <Select
                      value={approvalStrategy}
                      onChange={(e) => setApprovalStrategy(e.target.value as 'system-first' | 'direct-individual')}
                      label="승인 방식"
                    >
                      <MenuItem value="system-first">
                        <Box sx={{ display: 'flex', flexDirection: 'column', py: 1 }}>
                          <Typography variant="body2" fontWeight="bold" color="primary.main">
                            🏗️ 2단계 승인 (권장)
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            1단계: 시스템 전체 승인 → 2단계: 개별 지식 자산 승인
                          </Typography>
                          <Typography variant="caption" color="success.main">
                            • 체계적인 관리 • 품질 보장 • 아키텍처 검토
                          </Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="direct-individual">
                        <Box sx={{ display: 'flex', flexDirection: 'column', py: 1 }}>
                          <Typography variant="body2" fontWeight="bold">
                            ⚡ 개별 직접 승인
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            각 지식 자산을 바로 개별 승인 프로세스로 진행
                          </Typography>
                          <Typography variant="caption" color="warning.main">
                            • 빠른 처리 • 간단한 구조 • 시스템 검토 생략
                          </Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Card>

                <Typography variant="h6" gutterBottom>
                  추출할 지식 자산 유형 선택
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={extractionOptions.extractCode}
                          onChange={(e) => setExtractionOptions({
                            ...extractionOptions,
                            extractCode: e.target.checked
                          })}
                        />
                      }
                      label="코드 컴포넌트"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={extractionOptions.extractDocuments}
                          onChange={(e) => setExtractionOptions({
                            ...extractionOptions,
                            extractDocuments: e.target.checked
                          })}
                        />
                      }
                      label="문서"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={extractionOptions.extractDesignAssets}
                          onChange={(e) => setExtractionOptions({
                            ...extractionOptions,
                            extractDesignAssets: e.target.checked
                          })}
                        />
                      }
                      label="디자인 자산"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={extractionOptions.extractCatalogComponents}
                          onChange={(e) => setExtractionOptions({
                            ...extractionOptions,
                            extractCatalogComponents: e.target.checked
                          })}
                        />
                      }
                      label="카탈로그 컴포넌트"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" gutterBottom>
                  고급 옵션
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={extractionOptions.generateDiagrams}
                          onChange={(e) => setExtractionOptions({
                            ...extractionOptions,
                            generateDiagrams: e.target.checked
                          })}
                        />
                      }
                      label="다이어그램 자동 생성"
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={extractionOptions.mapRelationships}
                          onChange={(e) => setExtractionOptions({
                            ...extractionOptions,
                            mapRelationships: e.target.checked
                          })}
                        />
                      }
                      label="관계 매핑"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={extractionOptions.generateDocumentation}
                          onChange={(e) => setExtractionOptions({
                            ...extractionOptions,
                            generateDocumentation: e.target.checked
                          })}
                        />
                      }
                      label="자동 문서 생성"
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                  <Button onClick={() => setActiveStep(0)}>
                    이전
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleStartExtraction}
                    startIcon={<AutoIcon />}
                    disabled={isExtracting}
                  >
                    자동 추출 시작
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* 3단계: 자동 추출 */}
            <Step>
              <StepLabel>자동 추출</StepLabel>
              <StepContent>
                {isExtracting ? (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      🚀 지식 자산 자동 추출 진행 중...
                    </Typography>
                    
                    <LinearProgress sx={{ mb: 3 }} />
                    
                    {extractionProgress.length > 0 && (
                      <List>
                        {extractionProgress.map((step, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              {step.status === 'completed' ? (
                                <CheckIcon color="success" />
                              ) : step.status === 'error' ? (
                                <ErrorIcon color="error" />
                              ) : (
                                <CircularProgress size={20} />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={step.step}
                              secondary={step.message}
                            />
                            <ListItemSecondaryAction>
                              <Chip
                                label={`${step.progress}%`}
                                size="small"
                                color={step.status === 'completed' ? 'success' : 'default'}
                              />
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      ✅ 자동 추출 완료
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => setShowResultDialog(true)}
                      startIcon={<ViewIcon />}
                    >
                      결과 보기
                    </Button>
                  </Box>
                )}
              </StepContent>
            </Step>

            {/* 4단계: 결과 확인 */}
            <Step>
              <StepLabel>결과 확인</StepLabel>
              <StepContent>
                {extractionResult && (
                  <>
                    {renderExtractionSummary()}
                    
                    {/* [advice from AI] 승인 프로세스 안내 */}
                    {(extractionResult as any)?.approvalStrategy === 'system-first' && (
                      <Card sx={{ mt: 3, p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          🏗️ 시스템 승인 요청 생성됨
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          시스템 "{systemInfo.name}"의 승인 요청이 생성되었습니다.
                        </Typography>
                        <Box sx={{ pl: 2 }}>
                          <Typography variant="body2" gutterBottom>
                            📋 <strong>다음 단계:</strong>
                          </Typography>
                          <Typography variant="body2" component="div" sx={{ pl: 2 }}>
                            1. PO가 시스템 전체를 검토 및 승인<br/>
                            2. 승인 시 → 카탈로그 시스템에 등록<br/>
                            3. 승인 시 → 지식 자산에 시스템 등록<br/>
                            4. 개별 지식 자산들이 승인 대기 상태로 전환<br/>
                            5. 각 지식 자산을 개별적으로 승인/거부
                          </Typography>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                          <Button 
                            variant="contained" 
                            size="small"
                            onClick={() => window.open('/admin/approvals/dashboard', '_blank')}
                            sx={{ bgcolor: 'success.dark' }}
                            startIcon={<CheckIcon />}
                          >
                            승인 신청 확인
                          </Button>
                        </Box>
                      </Card>
                    )}
                  </>
                )}
                
                <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setActiveStep(0);
                      setExtractionResult(null);
                      setSourceRepo({ type: 'github', url: '', branch: 'main' });
                      setSystemInfo({ name: '', description: '', category: 'application', version: '1.0.0' });
                    }}
                  >
                    새로 시작
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setShowApprovalForm(true)}
                    startIcon={<CheckIcon />}
                    size="large"
                    sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
                  >
                    승인 신청
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => window.location.href = '/knowledge/my-approvals'}
                  >
                    내 승인 관리
                  </Button>
                  <Button
                    variant="text"
                    onClick={() => window.location.href = '/admin/approvals/dashboard'}
                  >
                    승인 현황 확인
                  </Button>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </CardContent>
      </Card>

      {/* 결과 상세 다이얼로그 */}
      <Dialog 
        open={showResultDialog} 
        onClose={() => setShowResultDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          🎉 자동 추출 결과
        </DialogTitle>
        <DialogContent>
          {extractionResult && (
            <Box>
              {renderExtractionSummary()}
              
              {extractionResult.warnings.length > 0 && (
                <Accordion sx={{ mt: 2 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>⚠️ 경고 ({extractionResult.warnings.length}개)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {extractionResult.warnings.map((warning, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={warning} />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
              
              {extractionResult.errors && extractionResult.errors.length > 0 && (
                <Accordion sx={{ mt: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>❌ 오류 ({extractionResult.errors.length}개)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {extractionResult.errors.map((error, index) => (
                        <ListItem key={index}>
                          <ListItemText 
                            primary={typeof error === 'string' ? error : (error.error || error.message || JSON.stringify(error))}
                            secondary={typeof error === 'object' && error && 'type' in error ? (error as any).type : null}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={() => setShowResultDialog(false)}
            variant="outlined"
          >
            닫기
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setShowResultDialog(false);
              setShowApprovalForm(true);
            }}
            startIcon={<CheckIcon />}
            size="large"
            sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
          >
            승인 신청
          </Button>
          <Button
            variant="text"
            onClick={() => window.location.href = '/knowledge/my-approvals'}
          >
            내 승인 관리
          </Button>
        </DialogActions>
      </Dialog>

      {/* [advice from AI] 승인 신청 폼 */}
      <ApprovalRequestForm
        open={showApprovalForm}
        onClose={() => setShowApprovalForm(false)}
        onSubmit={handleApprovalSubmit}
        data={{
          type: 'system_registration',
          title: systemInfo.name,
          description: systemInfo.description,
          systemInfo,
          extractionResult,
          metadata: {
            sourceRepo,
            extractionOptions
          }
        }}
      />
    </Container>
  );
};

export default AutoKnowledgeRegistration;
