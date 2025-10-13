// [advice from AI] GitHub 저장소 분석 컴포넌트
// 문서 가이드: GitHub 네이티브 우선 전략으로 레포지토리 컨텍스트 분석

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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  Tooltip
} from '@mui/material';
import { useJwtAuthStore } from '../../store/jwtAuthStore';

// [advice from AI] GitHub 저장소 분석 결과 인터페이스
interface RepositoryAnalysis {
  repository: {
    name: string;
    fullName: string;
    description: string;
    language: string;
    stars: number;
    forks: number;
    size: number;
    defaultBranch: string;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
  };
  branches: {
    name: string;
    protected: boolean;
    lastCommit: {
      sha: string;
      message: string;
      author: string;
      date: string;
    };
  }[];
  cicdPatterns: {
    hasGithubActions: boolean;
    hasJenkinsfile: boolean;
    hasDockerfile: boolean;
    hasDockerCompose: boolean;
    hasKubernetesManifests: boolean;
    hasArgocdConfig: boolean;
    workflows: string[];
  };
  codeQuality: {
    testCoverage?: number;
    codeComplexity?: number;
    securityIssues?: number;
    technicalDebt?: number;
  };
  metrics: {
    commits: number;
    contributors: number;
    pullRequests: number;
    issues: number;
    releases: number;
  };
  recommendations: {
    type: 'cicd' | 'security' | 'quality' | 'performance';
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

interface GitHubRepositoryAnalyzerProps {
  onAnalysisComplete?: (analysis: RepositoryAnalysis) => void;
  initialUrl?: string;
}

const GitHubRepositoryAnalyzer: React.FC<GitHubRepositoryAnalyzerProps> = ({
  onAnalysisComplete,
  initialUrl = ''
}) => {
  const { token } = useJwtAuthStore();
  
  // 상태 관리
  const [repositoryUrl, setRepositoryUrl] = useState(initialUrl);
  const [analysis, setAnalysis] = useState<RepositoryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | false>('repository');

  // API URL 생성
  const getApiUrl = () => {
    const currentHost = window.location.host;
    if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
      return 'http://localhost:3001';
    }
    return `http://${currentHost.split(':')[0]}:3001`;
  };

  // GitHub URL 유효성 검사
  const validateGitHubUrl = (url: string): boolean => {
    const githubPattern = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
    return githubPattern.test(url);
  };

  // 저장소 분석 실행
  const analyzeRepository = async () => {
    if (!repositoryUrl.trim()) {
      setError('GitHub 저장소 URL을 입력해주세요.');
      return null;
    }

    if (!validateGitHubUrl(repositoryUrl)) {
      setError('올바른 GitHub 저장소 URL을 입력해주세요. (예: https://github.com/owner/repo)');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${getApiUrl()}/api/operations/github/analyze-repository`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ repositoryUrl })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnalysis(data.data);
          onAnalysisComplete?.(data.data);
        } else {
          setError(data.message || '저장소 분석에 실패했습니다.');
        }
      } else {
        setError(`분석 요청 실패: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ 저장소 분석 실패:', error);
      setError('저장소 분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 우선순위별 색상
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  // 아코디언 섹션 토글
  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedSection(isExpanded ? panel : false);
  };

  return (
    <Box>
      {/* GitHub URL 입력 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            GitHub 저장소 분석
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            GitHub 저장소 URL을 입력하면 CI/CD 패턴, 코드 품질, 메트릭을 자동으로 분석합니다.
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="GitHub 저장소 URL"
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/owner/repository"
                disabled={loading}
                error={!!error}
                helperText={error}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="contained"
                onClick={analyzeRepository}
                disabled={loading || !repositoryUrl.trim()}
                sx={{ height: 56 }}
              >
                {loading ? <CircularProgress size={24} /> : '분석 시작'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 분석 결과 */}
      {analysis && (
        <Box>
          {/* 저장소 기본 정보 */}
          <Accordion 
            expanded={expandedSection === 'repository'} 
            onChange={handleAccordionChange('repository')}
          >
            <AccordionSummary>
              <Typography variant="h6">📁 저장소 정보</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>기본 정보</Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>이름:</strong> {analysis.repository.name}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>전체 이름:</strong> {analysis.repository.fullName}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>설명:</strong> {analysis.repository.description || '설명 없음'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>주 언어:</strong> {analysis.repository.language || '알 수 없음'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>기본 브랜치:</strong> {analysis.repository.defaultBranch}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>통계</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" sx={{ mb: 2 }}>
                    <Chip label={`⭐ ${analysis.repository.stars}`} size="small" />
                    <Chip label={`🍴 ${analysis.repository.forks}`} size="small" />
                    <Chip label={`📦 ${(analysis.repository.size / 1024).toFixed(1)}MB`} size="small" />
                    <Chip 
                      label={analysis.repository.isPrivate ? '🔒 Private' : '🌍 Public'} 
                      size="small" 
                      color={analysis.repository.isPrivate ? 'warning' : 'success'}
                    />
                  </Box>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    <strong>생성일:</strong> {new Date(analysis.repository.createdAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body2">
                    <strong>최근 업데이트:</strong> {new Date(analysis.repository.updatedAt).toLocaleDateString()}
                  </Typography>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 브랜치 정보 */}
          <Accordion 
            expanded={expandedSection === 'branches'} 
            onChange={handleAccordionChange('branches')}
          >
            <AccordionSummary>
              <Typography variant="h6">🌿 브랜치 정보</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>브랜치명</TableCell>
                      <TableCell align="center">보호 여부</TableCell>
                      <TableCell>최근 커밋</TableCell>
                      <TableCell>작성자</TableCell>
                      <TableCell>날짜</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analysis.branches.map((branch) => (
                      <TableRow key={branch.name}>
                        <TableCell>
                          <Chip 
                            label={branch.name} 
                            size="small" 
                            color={branch.name === analysis.repository.defaultBranch ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {branch.protected ? (
                            <Chip label="보호됨" size="small" color="success" />
                          ) : (
                            <Chip label="보호 안됨" size="small" color="default" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Tooltip title={branch.lastCommit.sha}>
                            <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {branch.lastCommit.message}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>{branch.lastCommit.author}</TableCell>
                        <TableCell>{new Date(branch.lastCommit.date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>

          {/* CI/CD 패턴 */}
          <Accordion 
            expanded={expandedSection === 'cicd'} 
            onChange={handleAccordionChange('cicd')}
          >
            <AccordionSummary>
              <Typography variant="h6">🔄 CI/CD 패턴 분석</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>감지된 CI/CD 도구</Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label="GitHub Actions" 
                        color={analysis.cicdPatterns.hasGithubActions ? 'success' : 'default'}
                        size="small"
                      />
                      {analysis.cicdPatterns.hasGithubActions && (
                        <Typography variant="caption" color="success.main">✓</Typography>
                      )}
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label="Jenkinsfile" 
                        color={analysis.cicdPatterns.hasJenkinsfile ? 'success' : 'default'}
                        size="small"
                      />
                      {analysis.cicdPatterns.hasJenkinsfile && (
                        <Typography variant="caption" color="success.main">✓</Typography>
                      )}
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label="Dockerfile" 
                        color={analysis.cicdPatterns.hasDockerfile ? 'success' : 'default'}
                        size="small"
                      />
                      {analysis.cicdPatterns.hasDockerfile && (
                        <Typography variant="caption" color="success.main">✓</Typography>
                      )}
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label="Docker Compose" 
                        color={analysis.cicdPatterns.hasDockerCompose ? 'success' : 'default'}
                        size="small"
                      />
                      {analysis.cicdPatterns.hasDockerCompose && (
                        <Typography variant="caption" color="success.main">✓</Typography>
                      )}
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label="Kubernetes" 
                        color={analysis.cicdPatterns.hasKubernetesManifests ? 'success' : 'default'}
                        size="small"
                      />
                      {analysis.cicdPatterns.hasKubernetesManifests && (
                        <Typography variant="caption" color="success.main">✓</Typography>
                      )}
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label="Argo CD" 
                        color={analysis.cicdPatterns.hasArgocdConfig ? 'success' : 'default'}
                        size="small"
                      />
                      {analysis.cicdPatterns.hasArgocdConfig && (
                        <Typography variant="caption" color="success.main">✓</Typography>
                      )}
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" sx={{ mb: 2 }}>GitHub Actions 워크플로우</Typography>
                  {analysis.cicdPatterns.workflows.length > 0 ? (
                    <Box display="flex" flexDirection="column" gap={1}>
                      {analysis.cicdPatterns.workflows.map((workflow, index) => (
                        <Chip key={index} label={workflow} size="small" variant="outlined" />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      워크플로우가 감지되지 않았습니다.
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 메트릭 */}
          <Accordion 
            expanded={expandedSection === 'metrics'} 
            onChange={handleAccordionChange('metrics')}
          >
            <AccordionSummary>
              <Typography variant="h6">📊 저장소 메트릭</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={6} md={2}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="primary.main">
                        {analysis.metrics.commits}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        커밋
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="success.main">
                        {analysis.metrics.contributors}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        기여자
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="info.main">
                        {analysis.metrics.pullRequests}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pull Request
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="warning.main">
                        {analysis.metrics.issues}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        이슈
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Typography variant="h4" color="secondary.main">
                        {analysis.metrics.releases}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        릴리즈
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* 추천사항 */}
          <Accordion 
            expanded={expandedSection === 'recommendations'} 
            onChange={handleAccordionChange('recommendations')}
          >
            <AccordionSummary>
              <Typography variant="h6">💡 개선 추천사항</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {analysis.recommendations.length > 0 ? (
                <Box display="flex" flexDirection="column" gap={2}>
                  {analysis.recommendations.map((rec, index) => (
                    <Alert 
                      key={index} 
                      severity={getPriorityColor(rec.priority) as any}
                      sx={{ textAlign: 'left' }}
                    >
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        {rec.title}
                      </Typography>
                      <Typography variant="body2">
                        {rec.description}
                      </Typography>
                    </Alert>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  현재 추천사항이 없습니다. 저장소가 잘 관리되고 있습니다!
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </Box>
  );
};

export default GitHubRepositoryAnalyzer;
