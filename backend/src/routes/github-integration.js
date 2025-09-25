// [advice from AI] GitHub 통합 API
// 문서 가이드: GitHub 네이티브 우선 전략으로 완전한 GitHub API 활용

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');

// PostgreSQL 연결
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// GitHub API 설정
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_API_BASE = 'https://api.github.com';

// [advice from AI] GitHub API 헬퍼 클래스 (문서 가이드 기반)
class GitHubEnhancedAPI {
  constructor(token) {
    this.token = token;
    this.headers = {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Timbel-Platform'
    };
  }

  // 레포지토리 메타데이터 실시간 동기화
  async syncRepositoryMetadata(repoFullName) {
    try {
      console.log(`🔍 GitHub 저장소 분석 시작: ${repoFullName}`);
      
      const [owner, repo] = repoFullName.split('/');
      
      // 병렬로 모든 데이터 수집
      const [
        repository,
        branches,
        commits,
        pullRequests,
        issues,
        releases,
        contents,
        workflows
      ] = await Promise.all([
        this.getRepository(owner, repo),
        this.getBranches(owner, repo),
        this.getCommits(owner, repo, { per_page: 100 }),
        this.getPullRequests(owner, repo, { state: 'all', per_page: 50 }),
        this.getIssues(owner, repo, { state: 'all', per_page: 50 }),
        this.getReleases(owner, repo),
        this.getRepositoryContents(owner, repo),
        this.getWorkflows(owner, repo)
      ]);

      return this.aggregateMetadata({
        repository,
        branches,
        commits,
        pullRequests,
        issues,
        releases,
        contents,
        workflows
      });
      
    } catch (error) {
      console.error('❌ GitHub 메타데이터 동기화 실패:', error);
      throw error;
    }
  }

  // 개별 API 호출 메서드들
  async getRepository(owner, repo) {
    const response = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
      headers: this.headers
    });
    return response.data;
  }

  async getBranches(owner, repo) {
    const response = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/branches`, {
      headers: this.headers,
      params: { per_page: 100 }
    });
    return response.data;
  }

  async getCommits(owner, repo, params = {}) {
    const response = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits`, {
      headers: this.headers,
      params: { per_page: 100, ...params }
    });
    return response.data;
  }

  async getPullRequests(owner, repo, params = {}) {
    const response = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/pulls`, {
      headers: this.headers,
      params: { per_page: 50, ...params }
    });
    return response.data;
  }

  async getIssues(owner, repo, params = {}) {
    const response = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues`, {
      headers: this.headers,
      params: { per_page: 50, ...params }
    });
    return response.data;
  }

  async getReleases(owner, repo) {
    try {
      const response = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/releases`, {
        headers: this.headers,
        params: { per_page: 50 }
      });
      return response.data;
    } catch (error) {
      return []; // 릴리즈가 없는 경우
    }
  }

  async getRepositoryContents(owner, repo, path = '') {
    try {
      const response = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
        headers: this.headers
      });
      return response.data;
    } catch (error) {
      return [];
    }
  }

  async getWorkflows(owner, repo) {
    try {
      const response = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/workflows`, {
        headers: this.headers
      });
      return response.data.workflows || [];
    } catch (error) {
      return [];
    }
  }

  // 메타데이터 집계 및 분석
  aggregateMetadata(data) {
    const { repository, branches, commits, pullRequests, issues, releases, contents, workflows } = data;

    // CI/CD 패턴 분석
    const cicdPatterns = this.analyzeCICDPatterns(contents, workflows);
    
    // 코드 품질 분석
    const codeQuality = this.analyzeCodeQuality(commits, pullRequests);
    
    // 메트릭 계산
    const metrics = this.calculateMetrics(commits, pullRequests, issues, releases);
    
    // 추천사항 생성
    const recommendations = this.generateRecommendations(cicdPatterns, codeQuality, metrics);

    return {
      repository: {
        name: repository.name,
        fullName: repository.full_name,
        description: repository.description,
        language: repository.language,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        size: repository.size,
        defaultBranch: repository.default_branch,
        isPrivate: repository.private,
        createdAt: repository.created_at,
        updatedAt: repository.updated_at
      },
      branches: branches.map(branch => ({
        name: branch.name,
        protected: branch.protected,
        lastCommit: {
          sha: branch.commit.sha,
          message: branch.commit.commit.message,
          author: branch.commit.commit.author.name,
          date: branch.commit.commit.author.date
        }
      })),
      cicdPatterns,
      codeQuality,
      metrics,
      recommendations
    };
  }

  // CI/CD 패턴 분석
  analyzeCICDPatterns(contents, workflows) {
    const fileNames = Array.isArray(contents) ? contents.map(item => item.name.toLowerCase()) : [];
    
    return {
      hasGithubActions: workflows.length > 0,
      hasJenkinsfile: fileNames.includes('jenkinsfile') || fileNames.includes('jenkins'),
      hasDockerfile: fileNames.includes('dockerfile'),
      hasDockerCompose: fileNames.some(name => name.includes('docker-compose')),
      hasKubernetesManifests: fileNames.some(name => name.includes('k8s') || name.includes('kubernetes')),
      hasArgocdConfig: fileNames.some(name => name.includes('argocd') || name.includes('argo')),
      workflows: workflows.map(workflow => workflow.name)
    };
  }

  // 코드 품질 분석
  analyzeCodeQuality(commits, pullRequests) {
    const recentCommits = commits.slice(0, 50);
    const avgCommitMessageLength = recentCommits.reduce((sum, commit) => 
      sum + (commit.commit.message?.length || 0), 0) / recentCommits.length;
    
    const mergedPRs = pullRequests.filter(pr => pr.merged_at);
    const avgPRSize = mergedPRs.reduce((sum, pr) => sum + (pr.additions + pr.deletions || 0), 0) / mergedPRs.length;

    return {
      commitQualityScore: Math.min(100, (avgCommitMessageLength / 50) * 100),
      prSizeScore: avgPRSize < 500 ? 100 : Math.max(0, 100 - ((avgPRSize - 500) / 50)),
      collaborationScore: pullRequests.length > 0 ? Math.min(100, (mergedPRs.length / pullRequests.length) * 100) : 0
    };
  }

  // 메트릭 계산
  calculateMetrics(commits, pullRequests, issues, releases) {
    const contributors = new Set(commits.map(commit => commit.author?.login).filter(Boolean));
    
    return {
      commits: commits.length,
      contributors: contributors.size,
      pullRequests: pullRequests.length,
      issues: issues.filter(issue => !issue.pull_request).length, // 실제 이슈만 카운트
      releases: releases.length
    };
  }

  // 추천사항 생성
  generateRecommendations(cicdPatterns, codeQuality, metrics) {
    const recommendations = [];

    // CI/CD 관련 추천
    if (!cicdPatterns.hasGithubActions) {
      recommendations.push({
        type: 'cicd',
        title: 'GitHub Actions 워크플로우 추가',
        description: 'CI/CD 자동화를 위해 GitHub Actions 워크플로우를 설정하는 것을 권장합니다.',
        priority: 'high'
      });
    }

    if (!cicdPatterns.hasDockerfile) {
      recommendations.push({
        type: 'cicd',
        title: 'Dockerfile 추가',
        description: '컨테이너화를 위해 Dockerfile을 추가하는 것을 권장합니다.',
        priority: 'medium'
      });
    }

    // 코드 품질 관련 추천
    if (codeQuality.commitQualityScore < 60) {
      recommendations.push({
        type: 'quality',
        title: '커밋 메시지 품질 개선',
        description: '더 상세하고 의미있는 커밋 메시지를 작성하는 것을 권장합니다.',
        priority: 'medium'
      });
    }

    if (codeQuality.collaborationScore < 50) {
      recommendations.push({
        type: 'quality',
        title: '코드 리뷰 프로세스 개선',
        description: 'Pull Request 기반 코드 리뷰 프로세스를 강화하는 것을 권장합니다.',
        priority: 'high'
      });
    }

    // 보안 관련 추천
    if (metrics.releases === 0) {
      recommendations.push({
        type: 'security',
        title: '릴리즈 관리 체계 구축',
        description: '정기적인 릴리즈를 통한 버전 관리 체계를 구축하는 것을 권장합니다.',
        priority: 'low'
      });
    }

    return recommendations;
  }

  // DORA 메트릭 자동 계산
  async calculateDORAMetrics(owner, repo) {
    try {
      const [deployments, commits, incidents] = await Promise.all([
        this.getDeployments(owner, repo),
        this.getCommits(owner, repo, { since: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() }),
        this.getIssues(owner, repo, { labels: 'bug,incident', state: 'all' })
      ]);

      return {
        deploymentFrequency: this.calculateDeploymentFrequency(deployments),
        leadTime: this.calculateLeadTime(commits, deployments),
        mttr: this.calculateMTTR(incidents),
        changeFailureRate: this.calculateChangeFailureRate(deployments)
      };
    } catch (error) {
      console.error('❌ DORA 메트릭 계산 실패:', error);
      return null;
    }
  }

  async getDeployments(owner, repo) {
    try {
      const response = await axios.get(`${GITHUB_API_BASE}/repos/${owner}/${repo}/deployments`, {
        headers: this.headers,
        params: { per_page: 100 }
      });
      return response.data;
    } catch (error) {
      return [];
    }
  }

  calculateDeploymentFrequency(deployments) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentDeployments = deployments.filter(d => new Date(d.created_at) > thirtyDaysAgo);
    return recentDeployments.length / 30; // 일일 평균 배포 횟수
  }

  calculateLeadTime(commits, deployments) {
    if (commits.length === 0 || deployments.length === 0) return 0;
    
    // 간단한 리드 타임 계산 (실제로는 더 복잡한 로직 필요)
    const avgCommitToDeployTime = 24 * 60; // 24시간을 분으로 (Mock 데이터)
    return avgCommitToDeployTime;
  }

  calculateMTTR(incidents) {
    const resolvedIncidents = incidents.filter(issue => issue.closed_at);
    if (resolvedIncidents.length === 0) return 0;

    const totalResolutionTime = resolvedIncidents.reduce((sum, issue) => {
      const createdAt = new Date(issue.created_at);
      const closedAt = new Date(issue.closed_at);
      return sum + (closedAt.getTime() - createdAt.getTime());
    }, 0);

    return totalResolutionTime / resolvedIncidents.length / (1000 * 60); // 분 단위
  }

  calculateChangeFailureRate(deployments) {
    if (deployments.length === 0) return 0;
    
    // 실제로는 배포 상태를 확인해야 하지만, 여기서는 Mock 데이터
    const failedDeployments = deployments.filter(d => d.description?.includes('failed')).length;
    return (failedDeployments / deployments.length) * 100;
  }
}

// [advice from AI] GitHub 저장소 분석 API
router.post('/analyze-repository', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 GitHub 저장소 분석 요청 수신...');
    
    const { repositoryUrl } = req.body;
    
    if (!repositoryUrl) {
      return res.status(400).json({
        success: false,
        message: 'GitHub 저장소 URL이 필요합니다.'
      });
    }

    // GitHub URL에서 owner/repo 추출
    const githubUrlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repositoryUrl.match(githubUrlPattern);
    
    if (!match) {
      return res.status(400).json({
        success: false,
        message: '올바른 GitHub 저장소 URL이 아닙니다.'
      });
    }

    const [, owner, repo] = match;
    const repoFullName = `${owner}/${repo.replace('.git', '')}`;

    if (!GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        message: 'GitHub 토큰이 설정되지 않았습니다.'
      });
    }

    // GitHub API 클래스 인스턴스 생성
    const githubAPI = new GitHubEnhancedAPI(GITHUB_TOKEN);
    
    // 저장소 분석 실행
    const analysis = await githubAPI.syncRepositoryMetadata(repoFullName);
    
    // 분석 결과를 데이터베이스에 저장 (선택적)
    try {
      const saveQuery = `
        INSERT INTO github_repository_analysis (
          repository_url, repository_name, analysis_data, created_at
        ) VALUES ($1, $2, $3, NOW())
        ON CONFLICT (repository_url) 
        DO UPDATE SET 
          analysis_data = $3, 
          updated_at = NOW()
      `;
      
      await pool.query(saveQuery, [
        repositoryUrl,
        repoFullName,
        JSON.stringify(analysis)
      ]);
      
      console.log(`✅ 저장소 분석 결과 저장 완료: ${repoFullName}`);
    } catch (dbError) {
      console.warn('⚠️ 분석 결과 저장 실패 (분석은 성공):', dbError.message);
    }

    res.json({
      success: true,
      data: analysis,
      message: `저장소 '${repoFullName}' 분석이 완료되었습니다.`
    });
    
  } catch (error) {
    console.error('❌ GitHub 저장소 분석 실패:', error);
    
    if (error.response?.status === 404) {
      res.status(404).json({
        success: false,
        message: '저장소를 찾을 수 없습니다. URL을 확인해주세요.'
      });
    } else if (error.response?.status === 403) {
      res.status(403).json({
        success: false,
        message: 'GitHub API 접근 권한이 없습니다. 토큰을 확인해주세요.'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '저장소 분석 중 오류가 발생했습니다.',
        error: error.message
      });
    }
  }
});

// [advice from AI] DORA 메트릭 계산 API
router.post('/calculate-dora-metrics', authenticateToken, async (req, res) => {
  try {
    console.log('📊 DORA 메트릭 계산 요청 수신...');
    
    const { repositoryUrl } = req.body;
    
    if (!repositoryUrl) {
      return res.status(400).json({
        success: false,
        message: 'GitHub 저장소 URL이 필요합니다.'
      });
    }

    const githubUrlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = repositoryUrl.match(githubUrlPattern);
    
    if (!match) {
      return res.status(400).json({
        success: false,
        message: '올바른 GitHub 저장소 URL이 아닙니다.'
      });
    }

    const [, owner, repo] = match;
    
    if (!GITHUB_TOKEN) {
      return res.status(500).json({
        success: false,
        message: 'GitHub 토큰이 설정되지 않았습니다.'
      });
    }

    const githubAPI = new GitHubEnhancedAPI(GITHUB_TOKEN);
    const doraMetrics = await githubAPI.calculateDORAMetrics(owner, repo.replace('.git', ''));
    
    res.json({
      success: true,
      data: doraMetrics,
      message: 'DORA 메트릭 계산이 완료되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ DORA 메트릭 계산 실패:', error);
    res.status(500).json({
      success: false,
      message: 'DORA 메트릭 계산 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] GitHub 저장소 목록 조회 API
router.get('/repositories', authenticateToken, async (req, res) => {
  try {
    console.log('📋 GitHub 저장소 목록 조회...');
    
    const query = `
      SELECT 
        repository_url,
        repository_name,
        analysis_data,
        created_at,
        updated_at
      FROM github_repository_analysis 
      ORDER BY updated_at DESC
      LIMIT 50
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      message: '저장소 목록을 성공적으로 조회했습니다.'
    });
    
  } catch (error) {
    console.error('❌ 저장소 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '저장소 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
