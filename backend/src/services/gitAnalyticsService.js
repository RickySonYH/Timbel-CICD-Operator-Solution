// [advice from AI] Git 활동 분석 및 진행률 추적 서비스
// 고도화: 작업 그룹별 레포지토리 관리, 상세 진행률 계산, 품질 분석

const axios = require('axios');
const { Pool } = require('pg');
const crypto = require('crypto');

class GitAnalyticsService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'timbel_db',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });
  }

  // [advice from AI] 레포지토리 등록
  async registerRepository(projectId, workGroupId, assignedPE, repositoryData) {
    const client = await this.pool.connect();
    try {
      console.log('📝 레포지토리 등록 시작:', repositoryData.repository_url);
      
      // 레포지토리 유효성 검증
      const isValid = await this.validateRepository(repositoryData.repository_url, repositoryData.access_token);
      if (!isValid) {
        throw new Error('레포지토리에 접근할 수 없습니다. URL과 토큰을 확인해주세요.');
      }
      
      // 레포지토리 등록 (중복 체크 후 INSERT)
      const existingRepo = await client.query(`
        SELECT id FROM project_repositories 
        WHERE project_id = $1 AND work_group_id = $2 AND assigned_pe = $3
      `, [projectId, workGroupId, assignedPE]);

      let repository;
      if (existingRepo.rows.length > 0) {
        // 기존 레포지토리 업데이트
        const updateResult = await client.query(`
          UPDATE project_repositories SET 
            repository_url = $4,
            repository_name = $5,
            platform = $6,
            branch_name = $7,
            repository_description = $8,
            is_private = $9,
            updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `, [
          existingRepo.rows[0].id,
          repositoryData.repository_url,
          repositoryData.repository_name || this.extractRepoName(repositoryData.repository_url),
          this.detectPlatform(repositoryData.repository_url),
          repositoryData.branch_name || 'main',
          repositoryData.description || '',
          repositoryData.is_private !== false
        ]);
        repository = updateResult.rows[0];
      } else {
        // 새 레포지토리 등록
        const insertResult = await client.query(`
          INSERT INTO project_repositories (
            project_id, work_group_id, assigned_pe, repository_url, repository_name,
            platform, branch_name, repository_description, is_private, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          projectId, workGroupId, assignedPE, repositoryData.repository_url,
          repositoryData.repository_name || this.extractRepoName(repositoryData.repository_url),
          this.detectPlatform(repositoryData.repository_url),
          repositoryData.branch_name || 'main',
          repositoryData.description || '',
          repositoryData.is_private !== false,
          assignedPE // created_by로 assigned_pe 사용
        ]);
        repository = insertResult.rows[0];
      }
      
      // Git 분석 테이블 초기화 (중복 체크 후 INSERT)
      const existingAnalytics = await client.query(`
        SELECT id FROM project_git_analytics 
        WHERE repository_id = $1
      `, [repository.id]);

      if (existingAnalytics.rows.length === 0) {
        await client.query(`
          INSERT INTO project_git_analytics (project_id, repository_id)
          VALUES ($1, $2)
        `, [projectId, repository.id]);
      }
      
      // 초기 분석 실행
      await this.analyzeRepository(client, repository);
      
      console.log('✅ 레포지토리 등록 완료:', repository.id);
      return repository;
      
    } finally {
      client.release();
    }
  }

  // [advice from AI] 레포지토리 유효성 검증
  async validateRepository(repositoryUrl, accessToken) {
    try {
      const { platform, owner, repo } = this.parseRepositoryUrl(repositoryUrl);
      
      if (platform === 'github') {
        const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: accessToken ? { 'Authorization': `token ${accessToken}` } : {},
          timeout: 10000
        });
        return response.status === 200;
      } else if (platform === 'gitlab') {
        const response = await axios.get(`https://gitlab.com/api/v4/projects/${owner}%2F${repo}`, {
          headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {},
          timeout: 10000
        });
        return response.status === 200;
      }
      
      return false;
    } catch (error) {
      console.log('❌ 레포지토리 검증 실패:', error.message);
      return false;
    }
  }

  // [advice from AI] 레포지토리 URL 파싱
  parseRepositoryUrl(url) {
    try {
      // GitHub: https://github.com/owner/repo
      const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (githubMatch) {
        return { platform: 'github', owner: githubMatch[1], repo: githubMatch[2].replace('.git', '') };
      }
      
      // GitLab: https://gitlab.com/owner/repo
      const gitlabMatch = url.match(/gitlab\.com\/([^\/]+)\/([^\/]+)/);
      if (gitlabMatch) {
        return { platform: 'gitlab', owner: gitlabMatch[1], repo: gitlabMatch[2].replace('.git', '') };
      }
      
      throw new Error('지원하지 않는 레포지토리 플랫폼입니다.');
    } catch (error) {
      throw new Error('레포지토리 URL 형식이 올바르지 않습니다.');
    }
  }

  // [advice from AI] 플랫폼 자동 감지
  detectPlatform(url) {
    if (url.includes('github.com')) return 'github';
    if (url.includes('gitlab.com')) return 'gitlab';
    if (url.includes('bitbucket.org')) return 'bitbucket';
    return 'github'; // 기본값
  }

  // [advice from AI] 레포지토리 이름 추출
  extractRepoName(url) {
    const parts = url.split('/');
    return parts[parts.length - 1].replace('.git', '');
  }

  // [advice from AI] 상세 레포지토리 분석
  async analyzeRepository(client, repository) {
    try {
      console.log('🔍 레포지토리 분석 시작:', repository.repository_url);
      
      const { platform, owner, repo } = this.parseRepositoryUrl(repository.repository_url);
      
      let gitData = {};
      
      if (platform === 'github') {
        gitData = await this.analyzeGitHubRepository(owner, repo, repository.access_token_encrypted);
      } else if (platform === 'gitlab') {
        gitData = await this.analyzeGitLabRepository(owner, repo, repository.access_token_encrypted);
      }
      
      // 진행률 계산
      const progressData = this.calculateDetailedProgress(gitData);
      
      // 데이터베이스 업데이트
      await client.query(`
        UPDATE project_git_analytics SET
          total_commits = $1,
          commits_last_7_days = $2,
          commits_last_30_days = $3,
          total_lines_added = $4,
          total_lines_deleted = $5,
          total_files = $6,
          code_files = $7,
          documentation_files = $8,
          test_files = $9,
          has_readme = $10,
          readme_quality_score = $11,
          has_changelog = $12,
          has_contributing_guide = $13,
          activity_score = $14,
          progress_percentage = $15,
          code_quality_score = $16,
          documentation_coverage = $17,
          avg_commit_size = $18,
          commit_frequency_score = $19,
          last_activity_days_ago = $20,
          last_commit_date = $21,
          last_push_date = $22,
          first_commit_date = $23,
          analyzed_at = NOW()
        WHERE repository_id = $24
      `, [
        gitData.total_commits || 0,
        gitData.commits_last_7_days || 0,
        gitData.commits_last_30_days || 0,
        gitData.total_lines_added || 0,
        gitData.total_lines_deleted || 0,
        gitData.total_files || 0,
        gitData.code_files || 0,
        gitData.documentation_files || 0,
        gitData.test_files || 0,
        gitData.has_readme || false,
        gitData.readme_quality_score || 0,
        gitData.has_changelog || false,
        gitData.has_contributing_guide || false,
        progressData.activity_score,
        progressData.progress_percentage,
        progressData.code_quality_score,
        progressData.documentation_coverage,
        gitData.avg_commit_size || 0,
        progressData.commit_frequency_score,
        gitData.last_activity_days_ago || 0,
        gitData.last_commit_date,
        gitData.last_push_date,
        gitData.first_commit_date,
        repository.id
      ]);
      
      // 프로젝트 할당 테이블의 진행률도 업데이트
      await client.query(`
        UPDATE project_work_assignments 
        SET progress_percentage = $1, updated_at = NOW()
        WHERE project_id = $2 AND assigned_to = $3
      `, [progressData.progress_percentage, repository.project_id, repository.assigned_pe]);
      
      console.log('✅ 레포지토리 분석 완료:', repository.id);
      
    } catch (error) {
      console.error('❌ 레포지토리 분석 실패:', error);
      
      // 에러 상태 업데이트
      await client.query(`
        UPDATE project_repositories 
        SET repository_status = 'error', sync_error_message = $1, updated_at = NOW()
        WHERE id = $2
      `, [error.message, repository.id]);
    }
  }

  // [advice from AI] GitHub 레포지토리 분석
  async analyzeGitHubRepository(owner, repo, accessToken) {
    try {
      const headers = accessToken ? { 'Authorization': `token ${accessToken}` } : {};
      
      // 기본 레포지토리 정보
      const repoResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      const repoData = repoResponse.data;
      
      // 커밋 정보
      const commitsResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits`, {
        headers,
        params: { per_page: 100 }
      });
      const commits = commitsResponse.data;
      
      // 파일 정보
      const contentsResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents`, { headers });
      const contents = contentsResponse.data;
      
      // 날짜 계산
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const commits_last_7_days = commits.filter(commit => 
        new Date(commit.commit.author.date) > sevenDaysAgo
      ).length;
      
      const commits_last_30_days = commits.filter(commit => 
        new Date(commit.commit.author.date) > thirtyDaysAgo
      ).length;
      
      // 파일 분석
      const fileAnalysis = this.analyzeFileStructure(contents);
      
      return {
        total_commits: commits.length,
        commits_last_7_days,
        commits_last_30_days,
        total_files: contents.length,
        ...fileAnalysis,
        last_commit_date: commits.length > 0 ? commits[0].commit.author.date : null,
        first_commit_date: commits.length > 0 ? commits[commits.length - 1].commit.author.date : null,
        last_push_date: repoData.pushed_at,
        avg_commit_size: this.calculateAverageCommitSize(commits),
        last_activity_days_ago: Math.floor((now - new Date(repoData.pushed_at)) / (1000 * 60 * 60 * 24))
      };
      
    } catch (error) {
      console.error('❌ GitHub 분석 실패:', error.message);
      return {};
    }
  }

  // [advice from AI] 파일 구조 분석
  analyzeFileStructure(contents) {
    let code_files = 0;
    let documentation_files = 0;
    let test_files = 0;
    let config_files = 0;
    let has_readme = false;
    let has_changelog = false;
    let has_contributing_guide = false;
    
    const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.php', '.rb', '.go'];
    const docExtensions = ['.md', '.txt', '.rst', '.doc', '.docx'];
    const testPatterns = ['test', 'spec', '__tests__'];
    const configExtensions = ['.json', '.yaml', '.yml', '.xml', '.ini', '.conf'];
    
    contents.forEach(file => {
      const fileName = file.name.toLowerCase();
      const fileExt = fileName.substring(fileName.lastIndexOf('.'));
      
      if (fileName === 'readme.md' || fileName === 'readme.txt') {
        has_readme = true;
        documentation_files++;
      } else if (fileName === 'changelog.md' || fileName === 'changelog.txt') {
        has_changelog = true;
        documentation_files++;
      } else if (fileName === 'contributing.md' || fileName === 'contributing.txt') {
        has_contributing_guide = true;
        documentation_files++;
      } else if (codeExtensions.includes(fileExt)) {
        code_files++;
      } else if (docExtensions.includes(fileExt)) {
        documentation_files++;
      } else if (testPatterns.some(pattern => fileName.includes(pattern))) {
        test_files++;
      } else if (configExtensions.includes(fileExt)) {
        config_files++;
      }
    });
    
    return {
      code_files,
      documentation_files,
      test_files,
      config_files,
      has_readme,
      has_changelog,
      has_contributing_guide,
      readme_quality_score: has_readme ? 80 : 0 // 기본 점수, 향후 내용 분석으로 개선
    };
  }

  // [advice from AI] 상세 진행률 계산
  calculateDetailedProgress(gitData) {
    const weights = {
      commits: 0.25,        // 커밋 활동
      codeLines: 0.20,      // 코드 라인 수
      documentation: 0.20,  // 문서화 수준
      fileStructure: 0.15,  // 파일 구조
      activity: 0.20        // 최근 활동
    };
    
    // 커밋 점수 (최근 30일 기준)
    const commitScore = Math.min((gitData.commits_last_30_days || 0) * 3, 100);
    
    // 코드 점수 (파일 수 기준)
    const codeScore = Math.min((gitData.code_files || 0) * 10, 100);
    
    // 문서화 점수
    const docScore = this.calculateDocumentationScore(gitData);
    
    // 파일 구조 점수
    const structureScore = this.calculateFileStructureScore(gitData);
    
    // 활동 점수 (최근 활동 기준)
    const activityScore = this.calculateActivityScore(gitData);
    
    const progress_percentage = Math.round(
      commitScore * weights.commits +
      codeScore * weights.codeLines +
      docScore * weights.documentation +
      structureScore * weights.fileStructure +
      activityScore * weights.activity
    );
    
    return {
      progress_percentage: Math.min(progress_percentage, 100),
      activity_score: activityScore,
      code_quality_score: Math.round((structureScore + docScore) / 2),
      documentation_coverage: docScore,
      commit_frequency_score: this.calculateCommitFrequencyScore(gitData)
    };
  }

  // [advice from AI] 문서화 점수 계산
  calculateDocumentationScore(gitData) {
    let score = 0;
    
    if (gitData.has_readme) score += 40;
    if (gitData.has_changelog) score += 20;
    if (gitData.has_contributing_guide) score += 20;
    
    // 문서 파일 비율
    const totalFiles = gitData.total_files || 1;
    const docRatio = (gitData.documentation_files || 0) / totalFiles;
    score += Math.min(docRatio * 100, 20);
    
    return Math.min(score, 100);
  }

  // [advice from AI] 파일 구조 점수 계산
  calculateFileStructureScore(gitData) {
    let score = 0;
    
    // 코드 파일 존재
    if ((gitData.code_files || 0) > 0) score += 30;
    
    // 테스트 파일 존재
    if ((gitData.test_files || 0) > 0) score += 25;
    
    // 설정 파일 존재
    if ((gitData.config_files || 0) > 0) score += 15;
    
    // 파일 다양성
    const diversity = Math.min(gitData.total_files || 0, 10) * 3;
    score += diversity;
    
    return Math.min(score, 100);
  }

  // [advice from AI] 활동 점수 계산
  calculateActivityScore(gitData) {
    const lastActivityDays = gitData.last_activity_days_ago || 999;
    
    if (lastActivityDays <= 1) return 100;
    if (lastActivityDays <= 3) return 80;
    if (lastActivityDays <= 7) return 60;
    if (lastActivityDays <= 14) return 40;
    if (lastActivityDays <= 30) return 20;
    
    return 0;
  }

  // [advice from AI] 커밋 빈도 점수 계산
  calculateCommitFrequencyScore(gitData) {
    const commits7Days = gitData.commits_last_7_days || 0;
    const commits30Days = gitData.commits_last_30_days || 0;
    
    // 일주일 평균 커밋 수
    const avgWeeklyCommits = commits7Days;
    const avgDailyCommits = commits30Days / 30;
    
    if (avgDailyCommits >= 2) return 100;
    if (avgDailyCommits >= 1) return 80;
    if (avgWeeklyCommits >= 3) return 60;
    if (avgWeeklyCommits >= 1) return 40;
    if (commits30Days >= 1) return 20;
    
    return 0;
  }

  // [advice from AI] 평균 커밋 크기 계산
  calculateAverageCommitSize(commits) {
    if (!commits || commits.length === 0) return 0;
    
    // 실제 구현에서는 각 커밋의 변경 사항을 분석해야 하지만,
    // 여기서는 간단히 커밋 메시지 길이를 기준으로 계산
    const totalSize = commits.reduce((sum, commit) => {
      return sum + (commit.commit.message ? commit.commit.message.length : 0);
    }, 0);
    
    return Math.round(totalSize / commits.length);
  }

  // [advice from AI] 모든 활성 레포지토리의 진행률 업데이트 (일일 배치)
  async updateAllProjectsProgress() {
    try {
      console.log('🔄 전체 프로젝트 진행률 업데이트 시작...');
      
      const client = await this.pool.connect();
      
      try {
        // 활성 레포지토리 목록 조회
        const repositoriesResult = await client.query(`
          SELECT 
            pr.*,
            p.name as project_name,
            p.deadline,
            p.created_at as project_start_date,
            wg.name as work_group_name
          FROM project_repositories pr
          JOIN projects p ON pr.project_id = p.id
          LEFT JOIN work_groups wg ON pr.work_group_id = wg.id
          WHERE pr.status = 'active' 
            AND p.project_status IN ('in_progress', 'development')
          ORDER BY p.created_at DESC
        `);
        
        console.log(`📊 분석 대상 레포지토리: ${repositoriesResult.rows.length}개`);
        
        const updateResults = [];
        
        for (const repo of repositoriesResult.rows) {
          try {
            console.log(`🔍 분석 중: ${repo.project_name} - ${repo.repository_name}`);
            
            // Git 활동 데이터 수집
            const gitActivity = await this.fetchGitActivity(repo);
            
            // 진행률 계산
            const progressData = await this.calculateProgress(repo, gitActivity);
            
            // 데이터베이스 업데이트
            await this.updateProjectProgressFromGit(client, repo.project_id, progressData);
            
            updateResults.push({
              project_id: repo.project_id,
              project_name: repo.project_name,
              repository_name: repo.repository_name,
              progress_data: progressData,
              status: 'success'
            });
            
          } catch (error) {
            console.error(`❌ ${repo.project_name} 분석 실패:`, error.message);
            updateResults.push({
              project_id: repo.project_id,
              project_name: repo.project_name,
              repository_name: repo.repository_name,
              status: 'error',
              error: error.message
            });
          }
        }
        
        console.log('✅ 전체 프로젝트 진행률 업데이트 완료');
        return updateResults;
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ 전체 진행률 업데이트 실패:', error);
      throw error;
    }
  }

  // [advice from AI] Git 활동 데이터 수집
  async fetchGitActivity(repository) {
    try {
      const platform = repository.platform.toLowerCase();
      const repoUrl = repository.repository_url;
      
      if (platform === 'github') {
        return await this.fetchGitHubActivity(repository);
      } else if (platform === 'gitlab') {
        return await this.fetchGitLabActivity(repository);
      } else {
        throw new Error(`지원하지 않는 플랫폼: ${platform}`);
      }
      
    } catch (error) {
      console.error('❌ Git 활동 데이터 수집 실패:', error);
      // 실패 시 기본값 반환
      return {
        total_commits: 0,
        commits_last_7_days: 0,
        commits_last_30_days: 0,
        total_lines_added: 0,
        total_lines_deleted: 0,
        active_branches: 1,
        last_commit_date: null,
        contributors: [],
        commit_frequency: 0
      };
    }
  }

  // [advice from AI] GitHub API를 통한 활동 데이터 수집
  async fetchGitHubActivity(repository) {
    try {
      // GitHub URL에서 owner/repo 추출
      const urlParts = repository.repository_url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!urlParts) {
        throw new Error('유효하지 않은 GitHub URL');
      }
      
      const [, owner, repo] = urlParts;
      const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
      
      // GitHub API 헤더 설정
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Timbel-Analytics'
      };
      
      // 액세스 토큰이 있는 경우 추가
      if (repository.access_token) {
        headers['Authorization'] = `token ${repository.access_token}`;
      }
      
      // 병렬로 여러 API 호출
      const [repoInfo, commits, branches, contributors] = await Promise.all([
        // 레포지토리 기본 정보
        axios.get(baseUrl, { headers }).catch(() => ({ data: {} })),
        
        // 최근 커밋 목록 (최대 100개)
        axios.get(`${baseUrl}/commits?per_page=100`, { headers }).catch(() => ({ data: [] })),
        
        // 브랜치 목록
        axios.get(`${baseUrl}/branches`, { headers }).catch(() => ({ data: [] })),
        
        // 기여자 목록
        axios.get(`${baseUrl}/contributors`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      // 날짜 기준 커밋 분석
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const commitsLast7Days = commits.data.filter(commit => 
        new Date(commit.commit.author.date) > sevenDaysAgo
      );
      
      const commitsLast30Days = commits.data.filter(commit => 
        new Date(commit.commit.author.date) > thirtyDaysAgo
      );
      
      // 코드 변경량 분석 (샘플링)
      let totalLinesAdded = 0;
      let totalLinesDeleted = 0;
      
      // 최근 10개 커밋의 변경량 분석
      const recentCommits = commits.data.slice(0, 10);
      for (const commit of recentCommits) {
        try {
          const commitDetail = await axios.get(commit.url, { headers });
          const stats = commitDetail.data.stats;
          if (stats) {
            totalLinesAdded += stats.additions || 0;
            totalLinesDeleted += stats.deletions || 0;
          }
        } catch (error) {
          // 개별 커밋 분석 실패는 무시
        }
      }
      
      // 커밋 빈도 계산 (주당 평균)
      const commitFrequency = commitsLast30Days.length / 4.3; // 30일을 주 단위로 변환
      
      return {
        total_commits: commits.data.length,
        commits_last_7_days: commitsLast7Days.length,
        commits_last_30_days: commitsLast30Days.length,
        total_lines_added: totalLinesAdded,
        total_lines_deleted: totalLinesDeleted,
        active_branches: branches.data.length,
        last_commit_date: commits.data[0]?.commit?.author?.date || null,
        contributors: contributors.data.map(c => ({
          login: c.login,
          contributions: c.contributions
        })),
        commit_frequency: commitFrequency,
        repository_size: repoInfo.data.size || 0,
        open_issues: repoInfo.data.open_issues || 0
      };
      
    } catch (error) {
      console.error('❌ GitHub 활동 데이터 수집 실패:', error.message);
      throw error;
    }
  }

  // [advice from AI] GitLab API를 통한 활동 데이터 수집
  async fetchGitLabActivity(repository) {
    try {
      // GitLab URL에서 프로젝트 ID 또는 경로 추출
      const urlParts = repository.repository_url.match(/gitlab\.com\/([^\/]+)\/([^\/\.]+)/);
      if (!urlParts) {
        throw new Error('유효하지 않은 GitLab URL');
      }
      
      const [, namespace, project] = urlParts;
      const projectPath = `${namespace}/${project}`;
      const baseUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectPath)}`;
      
      // GitLab API 헤더 설정
      const headers = {
        'Accept': 'application/json'
      };
      
      // 액세스 토큰이 있는 경우 추가
      if (repository.access_token) {
        headers['Authorization'] = `Bearer ${repository.access_token}`;
      }
      
      // 병렬로 여러 API 호출
      const [projectInfo, commits, branches] = await Promise.all([
        // 프로젝트 기본 정보
        axios.get(baseUrl, { headers }).catch(() => ({ data: {} })),
        
        // 최근 커밋 목록
        axios.get(`${baseUrl}/repository/commits?per_page=100`, { headers }).catch(() => ({ data: [] })),
        
        // 브랜치 목록
        axios.get(`${baseUrl}/repository/branches`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      // 날짜 기준 커밋 분석 (GitHub와 동일한 로직)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const commitsLast7Days = commits.data.filter(commit => 
        new Date(commit.created_at) > sevenDaysAgo
      );
      
      const commitsLast30Days = commits.data.filter(commit => 
        new Date(commit.created_at) > thirtyDaysAgo
      );
      
      const commitFrequency = commitsLast30Days.length / 4.3;
      
      return {
        total_commits: commits.data.length,
        commits_last_7_days: commitsLast7Days.length,
        commits_last_30_days: commitsLast30Days.length,
        total_lines_added: 0, // GitLab API에서는 별도 호출 필요
        total_lines_deleted: 0,
        active_branches: branches.data.length,
        last_commit_date: commits.data[0]?.created_at || null,
        contributors: [], // 별도 API 호출 필요
        commit_frequency: commitFrequency,
        repository_size: 0,
        open_issues: projectInfo.data.open_issues_count || 0
      };
      
    } catch (error) {
      console.error('❌ GitLab 활동 데이터 수집 실패:', error.message);
      throw error;
    }
  }

  // [advice from AI] Git 활동 기반 진행률 계산
  async calculateProgress(repository, gitActivity) {
    try {
      const projectStartDate = new Date(repository.project_start_date);
      const deadline = repository.deadline ? new Date(repository.deadline) : null;
      const now = new Date();
      
      // 프로젝트 기간 계산
      const totalDays = deadline ? 
        Math.max(1, Math.ceil((deadline - projectStartDate) / (1000 * 60 * 60 * 24))) : 
        90; // 기본 90일
      
      const elapsedDays = Math.ceil((now - projectStartDate) / (1000 * 60 * 60 * 24));
      const timeProgress = Math.min(100, (elapsedDays / totalDays) * 100);
      
      // Git 활동 기반 진행률 계산
      let activityScore = 0;
      
      // 1. 커밋 빈도 점수 (0-30점)
      const commitScore = Math.min(30, gitActivity.commit_frequency * 5);
      activityScore += commitScore;
      
      // 2. 최근 활동 점수 (0-25점)
      const recentActivityScore = Math.min(25, gitActivity.commits_last_7_days * 3);
      activityScore += recentActivityScore;
      
      // 3. 코드 변경량 점수 (0-25점)
      const codeChangeScore = Math.min(25, (gitActivity.total_lines_added + gitActivity.total_lines_deleted) / 100);
      activityScore += codeChangeScore;
      
      // 4. 브랜치 활동 점수 (0-10점)
      const branchScore = Math.min(10, gitActivity.active_branches * 2);
      activityScore += branchScore;
      
      // 5. 지속성 점수 (0-10점) - 최근 30일 동안의 일관된 활동
      const consistencyScore = gitActivity.commits_last_30_days > 0 ? 
        Math.min(10, (gitActivity.commits_last_30_days / 30) * 10) : 0;
      activityScore += consistencyScore;
      
      // 전체 진행률 계산 (시간 진행률과 활동 점수의 가중 평균)
      const timeWeight = 0.3; // 시간 진행률 30%
      const activityWeight = 0.7; // 활동 점수 70%
      
      const calculatedProgress = Math.min(100, 
        (timeProgress * timeWeight) + (activityScore * activityWeight)
      );
      
      // 마일스톤 기반 보정
      let milestoneBonus = 0;
      if (gitActivity.total_commits > 0) milestoneBonus += 5; // 첫 커밋
      if (gitActivity.commits_last_7_days > 0) milestoneBonus += 5; // 최근 활동
      if (gitActivity.active_branches > 1) milestoneBonus += 3; // 브랜치 활용
      if (gitActivity.contributors.length > 1) milestoneBonus += 2; // 협업
      
      const finalProgress = Math.min(100, calculatedProgress + milestoneBonus);
      
      return {
        calculated_progress: Math.round(finalProgress),
        time_progress: Math.round(timeProgress),
        activity_score: Math.round(activityScore),
        commit_score: Math.round(commitScore),
        recent_activity_score: Math.round(recentActivityScore),
        code_change_score: Math.round(codeChangeScore),
        branch_score: Math.round(branchScore),
        consistency_score: Math.round(consistencyScore),
        milestone_bonus: milestoneBonus,
        analysis_date: now.toISOString(),
        git_activity: gitActivity,
        project_timeline: {
          start_date: projectStartDate.toISOString(),
          deadline: deadline?.toISOString() || null,
          elapsed_days: elapsedDays,
          total_days: totalDays,
          days_remaining: deadline ? Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))) : null
        }
      };
      
    } catch (error) {
      console.error('❌ 진행률 계산 실패:', error);
      throw error;
    }
  }

  // [advice from AI] Git 기반 프로젝트 진행률 데이터베이스 업데이트
  async updateProjectProgressFromGit(client, projectId, progressData) {
    try {
      await client.query('BEGIN');
      
      // 프로젝트 진행률 업데이트
      await client.query(`
        UPDATE projects 
        SET 
          progress_rate = $1,
          project_status = CASE 
            WHEN $1 >= 100 THEN 'completed'
            WHEN $1 >= 10 THEN 'in_progress'
            ELSE project_status
          END,
          updated_at = NOW()
        WHERE id = $2
      `, [progressData.calculated_progress, projectId]);
      
      // Git 분석 결과 저장
      await client.query(`
        INSERT INTO project_git_analytics (
          project_id, analysis_date, calculated_progress, time_progress,
          activity_score, total_commits, commits_last_7_days, commits_last_30_days,
          commit_frequency, total_lines_added, total_lines_deleted,
          active_branches, last_commit_date, analysis_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (project_id, analysis_date::date) 
        DO UPDATE SET
          calculated_progress = EXCLUDED.calculated_progress,
          time_progress = EXCLUDED.time_progress,
          activity_score = EXCLUDED.activity_score,
          total_commits = EXCLUDED.total_commits,
          commits_last_7_days = EXCLUDED.commits_last_7_days,
          commits_last_30_days = EXCLUDED.commits_last_30_days,
          commit_frequency = EXCLUDED.commit_frequency,
          total_lines_added = EXCLUDED.total_lines_added,
          total_lines_deleted = EXCLUDED.total_lines_deleted,
          active_branches = EXCLUDED.active_branches,
          last_commit_date = EXCLUDED.last_commit_date,
          analysis_data = EXCLUDED.analysis_data,
          updated_at = NOW()
      `, [
        projectId,
        progressData.analysis_date,
        progressData.calculated_progress,
        progressData.time_progress,
        progressData.activity_score,
        progressData.git_activity.total_commits,
        progressData.git_activity.commits_last_7_days,
        progressData.git_activity.commits_last_30_days,
        progressData.git_activity.commit_frequency,
        progressData.git_activity.total_lines_added,
        progressData.git_activity.total_lines_deleted,
        progressData.git_activity.active_branches,
        progressData.git_activity.last_commit_date,
        JSON.stringify(progressData)
      ]);
      
      await client.query('COMMIT');
      
      console.log(`✅ 프로젝트 ${projectId} 진행률 업데이트 완료: ${progressData.calculated_progress}%`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  }

  // [advice from AI] Git 분석 테이블 생성
  async ensureGitAnalyticsTable() {
    try {
      const client = await this.pool.connect();
      
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS project_git_analytics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            analysis_date TIMESTAMP NOT NULL DEFAULT NOW(),
            calculated_progress INTEGER NOT NULL DEFAULT 0,
            time_progress INTEGER NOT NULL DEFAULT 0,
            activity_score INTEGER NOT NULL DEFAULT 0,
            total_commits INTEGER NOT NULL DEFAULT 0,
            commits_last_7_days INTEGER NOT NULL DEFAULT 0,
            commits_last_30_days INTEGER NOT NULL DEFAULT 0,
            commit_frequency DECIMAL(5,2) NOT NULL DEFAULT 0,
            total_lines_added INTEGER NOT NULL DEFAULT 0,
            total_lines_deleted INTEGER NOT NULL DEFAULT 0,
            active_branches INTEGER NOT NULL DEFAULT 1,
            last_commit_date TIMESTAMP,
            analysis_data JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            UNIQUE(project_id, analysis_date)
          )
        `);
        
        // 인덱스 생성
        await client.query(`
          CREATE INDEX IF NOT EXISTS idx_git_analytics_project_date 
          ON project_git_analytics(project_id, analysis_date DESC)
        `);
        
        console.log('✅ Git 분석 테이블 준비 완료');
        
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('❌ Git 분석 테이블 생성 실패:', error);
      throw error;
    }
  }
}

module.exports = GitAnalyticsService;
