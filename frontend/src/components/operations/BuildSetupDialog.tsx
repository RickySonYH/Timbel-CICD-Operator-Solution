// [advice from AI] 빌드 초기 설정 대화창 - 등록된 레포지토리 기반 CI/CD 파이프라인 설정
import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Stepper, Step, StepLabel, Box, Typography, TextField,
  FormControl, InputLabel, Select, MenuItem, Chip, Alert,
  Card, CardContent, Grid, Divider, Switch, FormControlLabel,
  Accordion, AccordionSummary, AccordionDetails, List, ListItem,
  ListItemText, ListItemIcon, IconButton, Tooltip, CircularProgress
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 인터페이스 정의
interface Repository {
  id: string;
  name: string;
  description: string;
  repository_url: string;
  branch: string;
  language: string;
  framework?: string;
  status: string;
  created_at: string;
  owner_name?: string;
}

interface BuildConfiguration {
  repositoryId: string;
  repositoryName: string;
  repositoryUrl: string;
  branch: string;
  buildType: 'docker' | 'maven' | 'gradle' | 'npm' | 'python';
  dockerfilePath: string;
  buildCommands: string[];
  testCommands: string[];
  environment: 'development' | 'staging' | 'production';
  autoTrigger: boolean;
  notifications: boolean;
  nexusRepository: string;
  imageName: string;
  imageTag: string;
  resources: {
    cpu: string;
    memory: string;
  };
}

interface BuildSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: (config: BuildConfiguration) => void;
}

const BuildSetupDialog: React.FC<BuildSetupDialogProps> = ({
  open,
  onClose,
  onComplete
}) => {
  const { token } = useJwtAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 데이터 상태
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  
  // 빌드 설정 상태
  const [buildConfig, setBuildConfig] = useState<BuildConfiguration>({
    repositoryId: '',
    repositoryName: '',
    repositoryUrl: '',
    branch: 'main',
    buildType: 'docker',
    dockerfilePath: './Dockerfile',
    buildCommands: [],
    testCommands: [],
    environment: 'development',
    autoTrigger: true,
    notifications: true,
    nexusRepository: 'docker-hosted',
    imageName: '',
    imageTag: 'latest',
    resources: {
      cpu: '1000m',
      memory: '1Gi'
    }
  });

  const steps = [
    '레포지토리 선택',
    '빌드 타입 설정',
    '환경 설정',
    '고급 옵션',
    '설정 확인'
  ];

  // 등록된 레포지토리 목록 조회
  const fetchRepositories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/catalog/systems', {
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
        // 레포지토리 URL이 있는 시스템만 필터링
        const repoSystems = result.data.filter((system: any) => 
          system.repository_url || system.description?.includes('github.com')
        ).map((system: any) => ({
          id: system.id,
          name: system.name,
          description: system.description,
          repository_url: system.repository_url || extractGitHubUrl(system.description),
          branch: 'main',
          language: detectLanguage(system.name, system.description),
          framework: detectFramework(system.name, system.description),
          status: system.status,
          created_at: system.created_at,
          owner_name: system.owner_name
        }));
        
        setRepositories(repoSystems);
      } else {
        throw new Error(result.message || '레포지토리 목록 조회 실패');
      }
    } catch (error) {
      console.error('레포지토리 조회 오류:', error);
      setError(error instanceof Error ? error.message : '레포지토리 조회 실패');
    } finally {
      setLoading(false);
    }
  };

  // GitHub URL 추출 헬퍼 함수
  const extractGitHubUrl = (text: string): string => {
    const githubRegex = /https?:\/\/github\.com\/[^\s]+/g;
    const match = text?.match(githubRegex);
    return match ? match[0] : '';
  };

  // 언어 감지 헬퍼 함수
  const detectLanguage = (name: string, description: string): string => {
    const text = `${name} ${description}`.toLowerCase();
    if (text.includes('python') || text.includes('django') || text.includes('flask')) return 'Python';
    if (text.includes('java') || text.includes('spring') || text.includes('maven')) return 'Java';
    if (text.includes('javascript') || text.includes('node') || text.includes('react') || text.includes('vue')) return 'JavaScript';
    if (text.includes('typescript') || text.includes('ts')) return 'TypeScript';
    if (text.includes('go') || text.includes('golang')) return 'Go';
    if (text.includes('rust')) return 'Rust';
    if (text.includes('php')) return 'PHP';
    if (text.includes('ruby')) return 'Ruby';
    if (text.includes('c#') || text.includes('dotnet')) return 'C#';
    return 'Unknown';
  };

  // 프레임워크 감지 헬퍼 함수
  const detectFramework = (name: string, description: string): string => {
    const text = `${name} ${description}`.toLowerCase();
    if (text.includes('react')) return 'React';
    if (text.includes('vue')) return 'Vue.js';
    if (text.includes('angular')) return 'Angular';
    if (text.includes('spring')) return 'Spring Boot';
    if (text.includes('django')) return 'Django';
    if (text.includes('flask')) return 'Flask';
    if (text.includes('express')) return 'Express.js';
    if (text.includes('fastapi')) return 'FastAPI';
    if (text.includes('gin')) return 'Gin';
    if (text.includes('laravel')) return 'Laravel';
    return '';
  };

  // 빌드 타입별 기본 설정 반환
  const getBuildTypeDefaults = (buildType: string, language: string) => {
    const defaults: any = {
      docker: {
        buildCommands: ['docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .'],
        testCommands: ['docker run --rm ${IMAGE_NAME}:${IMAGE_TAG} npm test'],
        dockerfilePath: './Dockerfile'
      },
      maven: {
        buildCommands: ['mvn clean compile', 'mvn package'],
        testCommands: ['mvn test'],
        dockerfilePath: './Dockerfile'
      },
      gradle: {
        buildCommands: ['./gradlew clean build'],
        testCommands: ['./gradlew test'],
        dockerfilePath: './Dockerfile'
      },
      npm: {
        buildCommands: ['npm ci', 'npm run build'],
        testCommands: ['npm test'],
        dockerfilePath: './Dockerfile'
      },
      python: {
        buildCommands: ['pip install -r requirements.txt', 'python setup.py build'],
        testCommands: ['pytest', 'python -m unittest'],
        dockerfilePath: './Dockerfile'
      }
    };

    return defaults[buildType] || defaults.docker;
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    if (open && token) {
      fetchRepositories();
    }
  }, [open, token]);

  // 레포지토리 선택 시 빌드 설정 업데이트
  useEffect(() => {
    if (selectedRepo) {
      const imageName = selectedRepo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      setBuildConfig(prev => ({
        ...prev,
        repositoryId: selectedRepo.id,
        repositoryName: selectedRepo.name,
        repositoryUrl: selectedRepo.repository_url,
        branch: selectedRepo.branch,
        imageName,
        ...getBuildTypeDefaults(prev.buildType, selectedRepo.language)
      }));
    }
  }, [selectedRepo]);

  // 빌드 타입 변경 시 기본 설정 업데이트
  useEffect(() => {
    if (selectedRepo) {
      const defaults = getBuildTypeDefaults(buildConfig.buildType, selectedRepo.language);
      setBuildConfig(prev => ({
        ...prev,
        ...defaults
      }));
    }
  }, [buildConfig.buildType, selectedRepo]);

  // 다음 단계로 이동
  const handleNext = () => {
    if (activeStep === 0 && !selectedRepo) {
      setError('레포지토리를 선택해주세요.');
      return null;
    }
    
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  // 이전 단계로 이동
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // 설정 완료
  const handleComplete = () => {
    onComplete(buildConfig);
    onClose();
  };

  // 대화창 닫기
  const handleClose = () => {
    setActiveStep(0);
    setSelectedRepo(null);
    setError(null);
    onClose();
  };

  // 단계별 컨텐츠 렌더링
  const renderStepContent = (step: number) => {
    switch (step) {
      case 0: // 레포지토리 선택
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              빌드할 레포지토리를 선택하세요
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              시스템에 등록된 레포지토리 중에서 CI/CD 파이프라인을 설정할 프로젝트를 선택합니다.
            </Typography>
            
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {repositories.map((repo) => (
                  <Grid item xs={12} md={6} key={repo.id}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        border: selectedRepo?.id === repo.id ? 2 : 1,
                        borderColor: selectedRepo?.id === repo.id ? 'primary.main' : 'divider'
                      }}
                      onClick={() => setSelectedRepo(repo)}
                    >
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {repo.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          {repo.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                          <Chip label={repo.language} size="small" color="primary" />
                          {repo.framework && (
                            <Chip label={repo.framework} size="small" color="secondary" />
                          )}
                          <Chip 
                            label={repo.status} 
                            size="small" 
                            color={repo.status === 'active' ? 'success' : 'default'} 
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {repo.repository_url}
                        </Typography>
                        {repo.owner_name && (
                          <Typography variant="body2" color="text.secondary">
                            소유자: {repo.owner_name}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
            
            {repositories.length === 0 && !loading && (
              <Alert severity="info">
                등록된 레포지토리가 없습니다. 먼저 시스템 카탈로그에서 프로젝트를 등록해주세요.
              </Alert>
            )}
          </Box>
        );

      case 1: // 빌드 타입 설정
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              빌드 타입 및 기본 설정
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              프로젝트의 빌드 방식을 선택하고 기본 설정을 구성합니다.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>빌드 타입</InputLabel>
                  <Select
                    value={buildConfig.buildType}
                    label="빌드 타입"
                    onChange={(e) => setBuildConfig(prev => ({ 
                      ...prev, 
                      buildType: e.target.value as any 
                    }))}
                  >
                    <MenuItem value="docker">Docker</MenuItem>
                    <MenuItem value="maven">Maven (Java)</MenuItem>
                    <MenuItem value="gradle">Gradle (Java/Kotlin)</MenuItem>
                    <MenuItem value="npm">NPM (Node.js)</MenuItem>
                    <MenuItem value="python">Python</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="브랜치"
                  value={buildConfig.branch}
                  onChange={(e) => setBuildConfig(prev => ({ 
                    ...prev, 
                    branch: e.target.value 
                  }))}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Dockerfile 경로"
                  value={buildConfig.dockerfilePath}
                  onChange={(e) => setBuildConfig(prev => ({ 
                    ...prev, 
                    dockerfilePath: e.target.value 
                  }))}
                  helperText="프로젝트 루트에서 Dockerfile까지의 상대 경로"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  빌드 명령어
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={buildConfig.buildCommands.join('\n')}
                  onChange={(e) => setBuildConfig(prev => ({ 
                    ...prev, 
                    buildCommands: e.target.value.split('\n').filter(cmd => cmd.trim()) 
                  }))}
                  placeholder="빌드 명령어를 한 줄씩 입력하세요"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  테스트 명령어
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={buildConfig.testCommands.join('\n')}
                  onChange={(e) => setBuildConfig(prev => ({ 
                    ...prev, 
                    testCommands: e.target.value.split('\n').filter(cmd => cmd.trim()) 
                  }))}
                  placeholder="테스트 명령어를 한 줄씩 입력하세요"
                />
              </Grid>
            </Grid>
          </Box>
        );

      case 2: // 환경 설정
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              배포 환경 설정
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              빌드된 이미지의 배포 환경과 레지스트리 설정을 구성합니다.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>배포 환경</InputLabel>
                  <Select
                    value={buildConfig.environment}
                    label="배포 환경"
                    onChange={(e) => setBuildConfig(prev => ({ 
                      ...prev, 
                      environment: e.target.value as any 
                    }))}
                  >
                    <MenuItem value="development">Development</MenuItem>
                    <MenuItem value="staging">Staging</MenuItem>
                    <MenuItem value="production">Production</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Nexus Repository</InputLabel>
                  <Select
                    value={buildConfig.nexusRepository}
                    label="Nexus Repository"
                    onChange={(e) => setBuildConfig(prev => ({ 
                      ...prev, 
                      nexusRepository: e.target.value 
                    }))}
                  >
                    <MenuItem value="docker-hosted">docker-hosted</MenuItem>
                    <MenuItem value="docker-proxy">docker-proxy</MenuItem>
                    <MenuItem value="docker-group">docker-group</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="이미지 이름"
                  value={buildConfig.imageName}
                  onChange={(e) => setBuildConfig(prev => ({ 
                    ...prev, 
                    imageName: e.target.value 
                  }))}
                  helperText="Docker 이미지 이름 (소문자, 하이픈만 사용)"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="이미지 태그"
                  value={buildConfig.imageTag}
                  onChange={(e) => setBuildConfig(prev => ({ 
                    ...prev, 
                    imageTag: e.target.value 
                  }))}
                  helperText="기본값: latest, 빌드 번호 자동 추가 가능"
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  리소스 설정
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="CPU 요청량"
                      value={buildConfig.resources.cpu}
                      onChange={(e) => setBuildConfig(prev => ({ 
                        ...prev, 
                        resources: { ...prev.resources, cpu: e.target.value }
                      }))}
                      helperText="예: 1000m, 2"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="메모리 요청량"
                      value={buildConfig.resources.memory}
                      onChange={(e) => setBuildConfig(prev => ({ 
                        ...prev, 
                        resources: { ...prev.resources, memory: e.target.value }
                      }))}
                      helperText="예: 1Gi, 512Mi"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        );

      case 3: // 고급 옵션
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              고급 옵션 설정
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              자동화 및 알림 설정을 구성합니다.
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={buildConfig.autoTrigger}
                      onChange={(e) => setBuildConfig(prev => ({ 
                        ...prev, 
                        autoTrigger: e.target.checked 
                      }))}
                    />
                  }
                  label="자동 빌드 트리거"
                />
                <Typography variant="body2" color="text.secondary">
                  Git push 시 자동으로 빌드를 시작합니다.
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={buildConfig.notifications}
                      onChange={(e) => setBuildConfig(prev => ({ 
                        ...prev, 
                        notifications: e.target.checked 
                      }))}
                    />
                  }
                  label="빌드 알림"
                />
                <Typography variant="body2" color="text.secondary">
                  빌드 완료/실패 시 알림을 받습니다.
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary>
                    <Typography variant="subtitle1">
                      환경 변수 설정 (선택사항)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={6}
                      placeholder="KEY1=value1&#10;KEY2=value2&#10;DATABASE_URL=postgresql://..."
                      helperText="환경 변수를 KEY=VALUE 형식으로 한 줄씩 입력하세요"
                    />
                  </AccordionDetails>
                </Accordion>
              </Grid>

              <Grid item xs={12}>
                <Accordion>
                  <AccordionSummary>
                    <Typography variant="subtitle1">
                      빌드 후 스크립트 (선택사항)
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="echo 'Build completed'&#10;curl -X POST https://api.slack.com/..."
                      helperText="빌드 완료 후 실행할 스크립트를 입력하세요"
                    />
                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>
          </Box>
        );

      case 4: // 설정 확인
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              설정 확인
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              설정한 내용을 확인하고 CI/CD 파이프라인을 생성합니다.
            </Typography>

            <Card>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  📁 레포지토리 정보
                </Typography>
                <Typography variant="body2">이름: {buildConfig.repositoryName}</Typography>
                <Typography variant="body2">URL: {buildConfig.repositoryUrl}</Typography>
                <Typography variant="body2">브랜치: {buildConfig.branch}</Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  🔧 빌드 설정
                </Typography>
                <Typography variant="body2">타입: {buildConfig.buildType}</Typography>
                <Typography variant="body2">Dockerfile: {buildConfig.dockerfilePath}</Typography>
                <Typography variant="body2">환경: {buildConfig.environment}</Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  🐳 이미지 설정
                </Typography>
                <Typography variant="body2">이름: {buildConfig.imageName}</Typography>
                <Typography variant="body2">태그: {buildConfig.imageTag}</Typography>
                <Typography variant="body2">레지스트리: {buildConfig.nexusRepository}</Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  ⚙️ 고급 옵션
                </Typography>
                <Typography variant="body2">
                  자동 트리거: {buildConfig.autoTrigger ? '활성화' : '비활성화'}
                </Typography>
                <Typography variant="body2">
                  알림: {buildConfig.notifications ? '활성화' : '비활성화'}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle1" gutterBottom>
                  💻 리소스
                </Typography>
                <Typography variant="body2">CPU: {buildConfig.resources.cpu}</Typography>
                <Typography variant="body2">메모리: {buildConfig.resources.memory}</Typography>
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return <Typography>알 수 없는 단계입니다.</Typography>;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h5">
          🚀 CI/CD 파이프라인 빌드 설정
        </Typography>
        <Typography variant="body2" color="text.secondary">
          등록된 레포지토리를 기반으로 자동화된 빌드 파이프라인을 설정합니다.
        </Typography>
      </DialogTitle>

      <DialogContent>
        {/* 단계 표시기 */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* 오류 표시 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 단계별 컨텐츠 */}
        {renderStepContent(activeStep)}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose}>
          취소
        </Button>
        <Box sx={{ flex: '1 1 auto' }} />
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          이전
        </Button>
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleComplete}
            disabled={!selectedRepo}
          >
            파이프라인 생성
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={activeStep === 0 && !selectedRepo}
          >
            다음
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BuildSetupDialog;
