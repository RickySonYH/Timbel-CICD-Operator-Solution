// [advice from AI] GitHub Actions 워크플로우 자동 생성 컴포넌트
// 문서 가이드: GitHub Actions + Jenkins 하이브리드 CI 구현

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] 워크플로우 템플릿 인터페이스
interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  framework?: string;
  triggers: string[];
  jobs: WorkflowJob[];
  jenkinsIntegration: boolean;
  ecp_ai_integration: boolean;
}

interface WorkflowJob {
  id: string;
  name: string;
  runs_on: string;
  steps: WorkflowStep[];
  needs?: string[];
}

interface WorkflowStep {
  id: string;
  name: string;
  uses?: string;
  run?: string;
  with?: Record<string, any>;
  env?: Record<string, string>;
}

// [advice from AI] 생성된 워크플로우 결과
interface GeneratedWorkflow {
  name: string;
  yaml: string;
  jenkinsfile?: string;
  dockerfile?: string;
  argocd_application?: string;
  helm_values?: string;
}

interface GitHubActionsBuilderProps {
  repositoryAnalysis?: any;
  onWorkflowGenerated?: (workflow: GeneratedWorkflow) => void;
}

const GitHubActionsBuilder: React.FC<GitHubActionsBuilderProps> = ({
  repositoryAnalysis,
  onWorkflowGenerated
}) => {
  const { token } = useJwtAuthStore();
  
  // 상태 관리
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customConfig, setCustomConfig] = useState({
    workflowName: '',
    language: '',
    framework: '',
    nodeVersion: '18',
    pythonVersion: '3.9',
    javaVersion: '11',
    enableJenkins: true,
    enableDocker: true,
    enableArgoCD: true,
    enableTesting: true,
    enableSecurity: true,
    enableCodeQuality: true,
    deploymentEnvironments: ['development', 'staging'],
    triggers: ['push', 'pull_request']
  });
  
  const [availableTemplates, setAvailableTemplates] = useState<WorkflowTemplate[]>([]);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<GeneratedWorkflow | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);

  // API URL 생성
  const getApiUrl = () => {
    const currentHost = window.location.host;
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      return 'http://localhost:3001';
    }
    return `http://${currentHost.split(':')[0]}:3001`;
  };

  // 사용 가능한 템플릿 로드
  const loadAvailableTemplates = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/operations/github/workflow-templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAvailableTemplates(data.data);
        }
      }
    } catch (error) {
      console.error('❌ 워크플로우 템플릿 로드 실패:', error);
    }
  };

  // 워크플로우 생성
  const generateWorkflow = async () => {
    if (!customConfig.workflowName || !customConfig.language) {
      alert('워크플로우 이름과 언어를 선택해주세요.');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        templateId: selectedTemplate,
        customConfig,
        repositoryAnalysis
      };

      const response = await fetch(`${getApiUrl()}/api/operations/github/generate-workflow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setGeneratedWorkflow(data.data);
          onWorkflowGenerated?.(data.data);
        }
      }
    } catch (error) {
      console.error('❌ 워크플로우 생성 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 템플릿 로드
  useEffect(() => {
    loadAvailableTemplates();
  }, []);

  // 저장소 분석 결과 기반 자동 설정
  useEffect(() => {
    if (repositoryAnalysis) {
      const { repository, cicdPatterns } = repositoryAnalysis;
      
      setCustomConfig(prev => ({
        ...prev,
        workflowName: `${repository.name}-ci-cd`,
        language: repository.language?.toLowerCase() || '',
        enableJenkins: !cicdPatterns.hasGithubActions, // GitHub Actions가 없으면 Jenkins 활성화
        enableDocker: !cicdPatterns.hasDockerfile, // Dockerfile이 없으면 Docker 생성 활성화
        enableArgoCD: !cicdPatterns.hasArgocdConfig // Argo CD 설정이 없으면 활성화
      }));
    }
  }, [repositoryAnalysis]);

  return (
    <Box>
      {/* 워크플로우 빌더 헤더 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            🔄 GitHub Actions + Jenkins 하이브리드 워크플로우 빌더
          </Typography>
          <Typography variant="body2" color="text.secondary">
            저장소 분석 결과를 기반으로 최적화된 CI/CD 워크플로우를 자동 생성합니다.
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* 설정 패널 */}
        <Grid item xs={12} md={6}>
          {/* 기본 설정 */}
          <Accordion defaultExpanded>
            <AccordionSummary>
              <Typography variant="h6">⚙️ 기본 설정</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  fullWidth
                  label="워크플로우 이름"
                  value={customConfig.workflowName}
                  onChange={(e) => setCustomConfig(prev => ({ ...prev, workflowName: e.target.value }))}
                  placeholder="my-app-ci-cd"
                />
                
                <FormControl fullWidth>
                  <InputLabel>주 언어</InputLabel>
                  <Select
                    value={customConfig.language}
                    onChange={(e) => setCustomConfig(prev => ({ ...prev, language: e.target.value }))}
                    label="주 언어"
                  >
                    <MenuItem value="javascript">JavaScript</MenuItem>
                    <MenuItem value="typescript">TypeScript</MenuItem>
                    <MenuItem value="python">Python</MenuItem>
                    <MenuItem value="java">Java</MenuItem>
                    <MenuItem value="go">Go</MenuItem>
                    <MenuItem value="rust">Rust</MenuItem>
                    <MenuItem value="php">PHP</MenuItem>
                    <MenuItem value="ruby">Ruby</MenuItem>
                  </Select>
                </FormControl>

                {customConfig.language === 'javascript' || customConfig.language === 'typescript' ? (
                  <FormControl fullWidth>
                    <InputLabel>Node.js 버전</InputLabel>
                    <Select
                      value={customConfig.nodeVersion}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, nodeVersion: e.target.value }))}
                      label="Node.js 버전"
                    >
                      <MenuItem value="16">Node.js 16</MenuItem>
                      <MenuItem value="18">Node.js 18</MenuItem>
                      <MenuItem value="20">Node.js 20</MenuItem>
                    </Select>
                  </FormControl>
                ) : null}

                {customConfig.language === 'python' ? (
                  <FormControl fullWidth>
                    <InputLabel>Python 버전</InputLabel>
                    <Select
                      value={customConfig.pythonVersion}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, pythonVersion: e.target.value }))}
                      label="Python 버전"
                    >
                      <MenuItem value="3.8">Python 3.8</MenuItem>
                      <MenuItem value="3.9">Python 3.9</MenuItem>
                      <MenuItem value="3.10">Python 3.10</MenuItem>
                      <MenuItem value="3.11">Python 3.11</MenuItem>
                    </Select>
                  </FormControl>
                ) : null}
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* 통합 설정 */}
          <Accordion>
            <AccordionSummary>
              <Typography variant="h6">🔗 통합 설정</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={customConfig.enableJenkins}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, enableJenkins: e.target.checked }))}
                    />
                  }
                  label="Jenkins 하이브리드 연동"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={customConfig.enableDocker}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, enableDocker: e.target.checked }))}
                    />
                  }
                  label="Docker 컨테이너화"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={customConfig.enableArgoCD}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, enableArgoCD: e.target.checked }))}
                    />
                  }
                  label="Argo CD GitOps"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={customConfig.enableTesting}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, enableTesting: e.target.checked }))}
                    />
                  }
                  label="자동 테스트"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={customConfig.enableSecurity}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, enableSecurity: e.target.checked }))}
                    />
                  }
                  label="보안 스캔"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={customConfig.enableCodeQuality}
                      onChange={(e) => setCustomConfig(prev => ({ ...prev, enableCodeQuality: e.target.checked }))}
                    />
                  }
                  label="코드 품질 검사"
                />
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* 트리거 설정 */}
          <Accordion>
            <AccordionSummary>
              <Typography variant="h6">🎯 트리거 설정</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="flex" flexDirection="column" gap={2}>
                <Typography variant="body2" color="text.secondary">
                  워크플로우를 실행할 이벤트를 선택하세요:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {['push', 'pull_request', 'release', 'schedule', 'workflow_dispatch'].map((trigger) => (
                    <Chip
                      key={trigger}
                      label={trigger}
                      clickable
                      color={customConfig.triggers.includes(trigger) ? 'primary' : 'default'}
                      onClick={() => {
                        setCustomConfig(prev => ({
                          ...prev,
                          triggers: prev.triggers.includes(trigger)
                            ? prev.triggers.filter(t => t !== trigger)
                            : [...prev.triggers, trigger]
                        }));
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* 미리보기 및 생성 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">📋 워크플로우 미리보기</Typography>
                <Box display="flex" gap={1}>
                  <Button
                    variant="outlined"
                    onClick={() => setPreviewDialog(true)}
                    disabled={!generatedWorkflow}
                  >
                    전체 보기
                  </Button>
                  <Button
                    variant="contained"
                    onClick={generateWorkflow}
                    disabled={loading || !customConfig.workflowName || !customConfig.language}
                  >
                    {loading ? <CircularProgress size={20} /> : '워크플로우 생성'}
                  </Button>
                </Box>
              </Box>

              {generatedWorkflow ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    워크플로우가 성공적으로 생성되었습니다!
                  </Alert>
                  
                  <Paper variant="outlined" sx={{ p: 2, mb: 2, maxHeight: 300, overflow: 'auto' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>GitHub Actions 워크플로우:</Typography>
                    <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {generatedWorkflow.yaml.substring(0, 500)}
                      {generatedWorkflow.yaml.length > 500 ? '...\n\n[전체 보기 버튼을 클릭하세요]' : ''}
                    </pre>
                  </Paper>

                  <Box display="flex" flexWrap="wrap" gap={1}>
                    {generatedWorkflow.jenkinsfile && (
                      <Chip label="Jenkinsfile 생성됨" color="primary" size="small" />
                    )}
                    {generatedWorkflow.dockerfile && (
                      <Chip label="Dockerfile 생성됨" color="secondary" size="small" />
                    )}
                    {generatedWorkflow.argocd_application && (
                      <Chip label="Argo CD App 생성됨" color="info" size="small" />
                    )}
                    {generatedWorkflow.helm_values && (
                      <Chip label="Helm Values 생성됨" color="success" size="small" />
                    )}
                  </Box>
                </Box>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body2" color="text.secondary">
                    설정을 완료하고 '워크플로우 생성' 버튼을 클릭하세요.
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* 저장소 분석 결과 요약 */}
          {repositoryAnalysis && (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>📊 저장소 분석 요약</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">언어:</Typography>
                    <Typography variant="body2">{repositoryAnalysis.repository.language || '알 수 없음'}</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">기본 브랜치:</Typography>
                    <Typography variant="body2">{repositoryAnalysis.repository.defaultBranch}</Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>감지된 도구:</Typography>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {repositoryAnalysis.cicdPatterns.hasGithubActions && (
                        <Chip label="GitHub Actions" size="small" color="success" />
                      )}
                      {repositoryAnalysis.cicdPatterns.hasJenkinsfile && (
                        <Chip label="Jenkins" size="small" color="info" />
                      )}
                      {repositoryAnalysis.cicdPatterns.hasDockerfile && (
                        <Chip label="Docker" size="small" color="primary" />
                      )}
                      {repositoryAnalysis.cicdPatterns.hasKubernetesManifests && (
                        <Chip label="Kubernetes" size="small" color="secondary" />
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* 전체 워크플로우 미리보기 다이얼로그 */}
      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="lg" fullWidth>
        <DialogTitle>생성된 워크플로우 전체 보기</DialogTitle>
        <DialogContent>
          {generatedWorkflow && (
            <Box>
              <Accordion defaultExpanded>
                <AccordionSummary>
                  <Typography variant="h6">GitHub Actions 워크플로우</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                    <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>
                      {generatedWorkflow.yaml}
                    </pre>
                  </Paper>
                </AccordionDetails>
              </Accordion>

              {generatedWorkflow.jenkinsfile && (
                <Accordion>
                  <AccordionSummary>
                    <Typography variant="h6">Jenkinsfile</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                      <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {generatedWorkflow.jenkinsfile}
                      </pre>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              )}

              {generatedWorkflow.dockerfile && (
                <Accordion>
                  <AccordionSummary>
                    <Typography variant="h6">Dockerfile</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Paper variant="outlined" sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
                      <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {generatedWorkflow.dockerfile}
                      </pre>
                    </Paper>
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>닫기</Button>
          <Button variant="contained" onClick={() => {
            // 다운로드 또는 저장 로직 추가 가능
            console.log('워크플로우 저장:', generatedWorkflow);
          }}>
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GitHubActionsBuilder;
