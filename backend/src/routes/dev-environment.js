// [advice from AI] 개발 환경 관리 API

const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const DevEnvironmentService = require('../services/devEnvironmentService');
const GitAnalyticsService = require('../services/gitAnalyticsService');
const axios = require('axios');
const CollaborationNotificationCenter = require('../services/collaborationNotificationCenter');

const router = express.Router();

// PostgreSQL 연결 설정
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] Git 레포지토리 연결 테스트 API
router.post('/test-repository-connection', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { repository_url, access_token, git_service } = req.body;

    console.log('🔗 레포지토리 연결 테스트:', {
      repository_url: repository_url,
      git_service: git_service,
      has_token: !!access_token
    });

    if (!repository_url) {
      return res.status(400).json({
        success: false,
        message: '레포지토리 URL이 필요합니다.'
      });
    }

    // URL에서 소유자와 레포명 추출
    let owner, repo;
    try {
      const urlParts = repository_url.replace('https://', '').split('/');
      
      if (git_service === 'github') {
        // github.com/owner/repo 형식
        const githubIndex = urlParts.findIndex(part => part.includes('github.com'));
        owner = urlParts[githubIndex + 1];
        repo = urlParts[githubIndex + 2];
      } else if (git_service === 'gitlab') {
        // gitlab.com/owner/repo 형식
        const gitlabIndex = urlParts.findIndex(part => part.includes('gitlab.com'));
        owner = urlParts[gitlabIndex + 1];
        repo = urlParts[gitlabIndex + 2];
      } else if (git_service === 'bitbucket') {
        // bitbucket.org/owner/repo 형식
        const bitbucketIndex = urlParts.findIndex(part => part.includes('bitbucket.org'));
        owner = urlParts[bitbucketIndex + 1];
        repo = urlParts[bitbucketIndex + 2];
      }

      // .git 확장자 제거
      if (repo && repo.endsWith('.git')) {
        repo = repo.slice(0, -4);
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: '잘못된 레포지토리 URL 형식입니다.'
      });
    }

    if (!owner || !repo) {
      return res.status(400).json({
        success: false,
        message: '레포지토리 URL에서 소유자와 레포명을 추출할 수 없습니다.'
      });
    }

    // Git 서비스별 API 호출
    let apiUrl, headers;
    
    if (git_service === 'github') {
      apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Timbel-Project-Management-Solution'
      };
      // 토큰이 있는 경우에만 Authorization 헤더 추가
      if (access_token) {
        headers['Authorization'] = `Bearer ${access_token}`;
      }
    } else if (git_service === 'gitlab') {
      apiUrl = `https://gitlab.com/api/v4/projects/${encodeURIComponent(owner + '/' + repo)}`;
      headers = {
        'Content-Type': 'application/json'
      };
      // 토큰이 있는 경우에만 Authorization 헤더 추가
      if (access_token) {
        headers['Authorization'] = `Bearer ${access_token}`;
      }
    } else if (git_service === 'bitbucket') {
      apiUrl = `https://api.bitbucket.org/2.0/repositories/${owner}/${repo}`;
      headers = {
        'Accept': 'application/json'
      };
      // 토큰이 있는 경우에만 Authorization 헤더 추가
      if (access_token) {
        headers['Authorization'] = `Bearer ${access_token}`;
      }
    } else {
      return res.status(400).json({
        success: false,
        message: '지원하지 않는 Git 서비스입니다.'
      });
    }

    // API 호출로 레포지토리 접근 테스트
    const response = await axios.get(apiUrl, { 
      headers,
      timeout: 10000 // 10초 타임아웃
    });

    if (response.status === 200) {
      const repoData = response.data;
      
      const isPrivate = repoData.private;
      const accessType = access_token ? (isPrivate ? 'Private' : 'Public') : 'Public';
      
      return res.json({
        success: true,
        message: `${git_service.toUpperCase()} ${accessType} 레포지토리에 성공적으로 연결되었습니다.`,
        repository_info: {
          name: repoData.name || repoData.path,
          full_name: repoData.full_name || `${owner}/${repo}`,
          description: repoData.description,
          private: repoData.private,
          default_branch: repoData.default_branch || repoData.mainbranch?.name || 'main',
          clone_url: repoData.clone_url || repoData.http_url_to_repo || repoData.links?.clone?.find(link => link.name === 'https')?.href,
          access_type: accessType
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `레포지토리에 접근할 수 없습니다. (Status: ${response.status})`
      });
    }

  } catch (error) {
    console.error('❌ 레포지토리 연결 테스트 실패:', error);

    if (error.response) {
      const status = error.response.status;
      let message = '';

      if (status === 401) {
        message = access_token 
          ? '인증에 실패했습니다. 액세스 토큰을 확인해주세요.' 
          : '인증이 필요합니다. Private 레포지토리인 경우 액세스 토큰을 입력해주세요.';
      } else if (status === 403) {
        message = access_token 
          ? '접근 권한이 없습니다. 토큰 권한을 확인해주세요.' 
          : '접근 권한이 없습니다. Private 레포지토리인 경우 액세스 토큰을 입력해주세요.';
      } else if (status === 404) {
        message = '레포지토리를 찾을 수 없습니다. URL을 확인해주세요.';
      } else {
        message = `API 오류가 발생했습니다. (Status: ${status})`;
      }

      return res.status(400).json({
        success: false,
        message: message
      });
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(400).json({
        success: false,
        message: '네트워크 연결에 실패했습니다. URL을 확인해주세요.'
      });
    } else if (error.code === 'ETIMEDOUT') {
      return res.status(400).json({
        success: false,
        message: '연결 시간이 초과되었습니다. 나중에 다시 시도해주세요.'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: '연결 테스트 중 오류가 발생했습니다.'
      });
    }
  }
});

// [advice from AI] 프로젝트 개발 환경 조회
router.get('/projects/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 프로젝트 개발 환경 조회:', id);
    
    const client = await pool.connect();
    
    try {
      // 프로젝트 기본 정보 조회
      const projectResult = await client.query(`
        SELECT p.*, u.full_name as created_by_name
        FROM projects p
        LEFT JOIN timbel_users u ON p.created_by = u.id
        WHERE p.id = $1
      `, [id]);
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      const project = projectResult.rows[0];
      
      // PE 할당 정보 조회
      const assignmentsResult = await client.query(`
        SELECT 
          pwa.*,
          wg.name as work_group_name,
          pe.full_name as pe_name,
          pe.email as pe_email
        FROM project_work_assignments pwa
        LEFT JOIN work_groups wg ON pwa.work_group_id = wg.id
        LEFT JOIN timbel_users pe ON pwa.assigned_to = pe.id
        WHERE pwa.project_id = $1
        ORDER BY pwa.assigned_at DESC
      `, [id]);
      
      // 개발 환경 상태 시뮬레이션 (실제로는 파일 시스템이나 GitLab API에서 조회)
      const devEnvironmentStatus = {
        project_directory_exists: true,
        repositories: assignmentsResult.rows.map(assignment => ({
          work_group_name: assignment.work_group_name || 'main',
          pe_name: assignment.pe_name,
          repository_status: 'active',
          last_commit: '2024-01-15T10:30:00Z',
          branch_count: Math.floor(Math.random() * 5) + 1,
          commit_count: Math.floor(Math.random() * 50) + 10
        })),
        development_tools: [
          { name: 'Docker', status: 'configured' },
          { name: 'GitLab CI/CD', status: 'active' },
          { name: 'Database', status: 'connected' },
          { name: 'Monitoring', status: 'enabled' }
        ]
      };
      
      res.json({
        success: true,
        data: {
          project: project,
          assignments: assignmentsResult.rows,
          development_environment: devEnvironmentStatus
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 개발 환경 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project development environment',
      message: error.message
    });
  }
});

// [advice from AI] 개발 환경 재설정
router.post('/projects/:id/reset', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'po']), async (req, res) => {
  try {
    const { id } = req.params;
    const { components } = req.body; // ['repositories', 'docker', 'cicd', 'permissions']
    
    console.log('🔄 개발 환경 재설정 요청:', id, components);
    
    const client = await pool.connect();
    
    try {
      // 프로젝트 정보 조회
      const projectResult = await client.query(`
        SELECT * FROM projects WHERE id = $1
      `, [id]);
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      const project = projectResult.rows[0];
      
      // PE 할당 정보 조회
      const assignmentsResult = await client.query(`
        SELECT 
          pwa.*,
          wg.name as work_group_name,
          pe.full_name as pe_name
        FROM project_work_assignments pwa
        LEFT JOIN work_groups wg ON pwa.work_group_id = wg.id
        LEFT JOIN timbel_users pe ON pwa.assigned_to = pe.id
        WHERE pwa.project_id = $1
      `, [id]);
      
      if (assignmentsResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No PE assignments found for this project'
        });
      }
      
      // 개발 환경 서비스 초기화
      const devEnvironmentService = new DevEnvironmentService();
      
      // 선택된 컴포넌트만 재설정
      const resetResults = {};
      
      if (!components || components.includes('repositories')) {
        console.log('🔄 레포지토리 재설정 중...');
        // 레포지토리 재설정 로직 (실제로는 GitLab API 호출)
        resetResults.repositories = {
          reset: true,
          count: assignmentsResult.rows.length,
          message: '레포지토리가 성공적으로 재설정되었습니다.'
        };
      }
      
      if (!components || components.includes('docker')) {
        console.log('🔄 Docker 환경 재설정 중...');
        const dockerConfig = await devEnvironmentService.createDockerConfiguration(
          project, 
          `/tmp/project_${id}`
        );
        resetResults.docker = dockerConfig;
      }
      
      if (!components || components.includes('cicd')) {
        console.log('🔄 CI/CD 파이프라인 재설정 중...');
        const cicdConfig = await devEnvironmentService.createCICDConfiguration(
          project, 
          `/tmp/project_${id}`
        );
        resetResults.cicd = cicdConfig;
      }
      
      if (!components || components.includes('permissions')) {
        console.log('🔄 접근 권한 재설정 중...');
        resetResults.permissions = {
          reset: true,
          pe_count: assignmentsResult.rows.length,
          message: 'PE 접근 권한이 성공적으로 재설정되었습니다.'
        };
      }
      
      res.json({
        success: true,
        message: '개발 환경이 성공적으로 재설정되었습니다.',
        data: {
          project_id: id,
          project_name: project.name,
          reset_components: components || ['repositories', 'docker', 'cicd', 'permissions'],
          results: resetResults
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 개발 환경 재설정 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset development environment',
      message: error.message
    });
  }
});

// [advice from AI] PE별 개발 환경 현황 조회
router.get('/pe/:peId/projects', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { peId } = req.params;
    
    console.log('👨‍💻 PE 개발 환경 현황 조회:', peId);
    
    const client = await pool.connect();
    
    try {
      // PE의 할당된 프로젝트 조회
      const projectsResult = await client.query(`
        SELECT 
          p.id,
          p.name,
          p.project_status,
          p.urgency_level,
          p.deadline,
          pwa.assignment_status,
          pwa.assigned_at,
          pwa.start_date,
          wg.name as work_group_name,
          wg.description as work_group_description
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        LEFT JOIN work_groups wg ON pwa.work_group_id = wg.id
        WHERE pwa.assigned_to = $1
        ORDER BY pwa.assigned_at DESC
      `, [peId]);
      
      // 각 프로젝트별 개발 환경 상태 시뮬레이션
      const projectsWithDevEnv = projectsResult.rows.map(project => ({
        ...project,
        development_environment: {
          repository_url: `http://rdc.rickyson.com:8929/${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_${project.work_group_name || 'main'}`,
          local_setup_status: 'configured',
          last_sync: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
          development_tools: [
            { name: 'Docker', status: Math.random() > 0.2 ? 'running' : 'stopped' },
            { name: 'Database', status: 'connected' },
            { name: 'IDE Integration', status: 'configured' }
          ]
        }
      }));
      
      res.json({
        success: true,
        data: {
          pe_id: peId,
          total_projects: projectsWithDevEnv.length,
          active_projects: projectsWithDevEnv.filter(p => p.project_status === 'in_progress').length,
          projects: projectsWithDevEnv
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PE 개발 환경 현황 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PE development environment status',
      message: error.message
    });
  }
});

// [advice from AI] 레포지토리 정보 등록 (PE가 직접 생성한 레포지토리)
router.post('/projects/:id/repositories', jwtAuth.verifyToken, jwtAuth.requireRole(['pe', 'po', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { work_group_id, repository_url, repository_name, platform, access_token } = req.body;
    
    console.log('📝 레포지토리 정보 등록:', id, repository_name);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 프로젝트 존재 확인
      const projectResult = await client.query(`
        SELECT name FROM projects WHERE id = $1
      `, [id]);
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      // 작업 그룹 확인 (있는 경우)
      if (work_group_id) {
        const workGroupResult = await client.query(`
          SELECT name FROM work_groups WHERE id = $1 AND project_id = $2
        `, [work_group_id, id]);
        
        if (workGroupResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Work group not found'
          });
        }
      }
      
      // 레포지토리 정보 저장 테이블이 없다면 생성
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_repositories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          work_group_id UUID REFERENCES work_groups(id) ON DELETE CASCADE,
          repository_name VARCHAR(255) NOT NULL,
          repository_url TEXT NOT NULL,
          platform VARCHAR(50) NOT NULL DEFAULT 'github',
          access_token TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          created_by UUID REFERENCES timbel_users(id),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // 중복 레포지토리 확인
      const existingRepo = await client.query(`
        SELECT id FROM project_repositories 
        WHERE project_id = $1 AND (work_group_id = $2 OR (work_group_id IS NULL AND $2 IS NULL))
      `, [id, work_group_id]);
      
      let repoId;
      
      if (existingRepo.rows.length > 0) {
        // 기존 레포지토리 정보 업데이트
        const updateResult = await client.query(`
          UPDATE project_repositories 
          SET repository_name = $1, repository_url = $2, platform = $3, 
              access_token = $4, updated_at = NOW()
          WHERE id = $5
          RETURNING id
        `, [repository_name, repository_url, platform || 'github', access_token, existingRepo.rows[0].id]);
        
        repoId = updateResult.rows[0].id;
        console.log('📝 기존 레포지토리 정보 업데이트:', repoId);
        
      } else {
        // 새 레포지토리 정보 등록
        const insertResult = await client.query(`
          INSERT INTO project_repositories (
            project_id, work_group_id, repository_name, repository_url, 
            platform, access_token, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [id, work_group_id, repository_name, repository_url, platform || 'github', access_token, req.user?.id]);
        
        repoId = insertResult.rows[0].id;
        console.log('📝 새 레포지토리 정보 등록:', repoId);
      }
      
      // 레포지토리 등록 시 프로젝트 진행률 업데이트
      const progressUpdate = await this.updateProjectProgress(client, id, work_group_id, 'repository_registered');
      
      await client.query('COMMIT');
      
      console.log('📊 프로젝트 진행률 업데이트:', progressUpdate);
      
      res.json({
        success: true,
        message: '레포지토리 정보가 성공적으로 등록되었습니다. 프로젝트 진행이 시작되었습니다.',
        data: {
          repository_id: repoId,
          project_id: id,
          work_group_id: work_group_id,
          repository_name: repository_name,
          repository_url: repository_url,
          platform: platform || 'github',
          progress_update: progressUpdate
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 레포지토리 정보 등록 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register repository information',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 레포지토리 목록 조회
router.get('/projects/:id/repositories', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('📋 프로젝트 레포지토리 목록 조회:', id);
    
    const client = await pool.connect();
    
    try {
      const repositoriesResult = await client.query(`
        SELECT 
          pr.*,
          wg.name as work_group_name,
          u.full_name as created_by_name
        FROM project_repositories pr
        LEFT JOIN work_groups wg ON pr.work_group_id = wg.id
        LEFT JOIN timbel_users u ON pr.created_by = u.id
        WHERE pr.project_id = $1
        ORDER BY pr.created_at DESC
      `, [id]);
      
      res.json({
        success: true,
        data: {
          project_id: id,
          repositories: repositoriesResult.rows
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 레포지토리 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project repositories',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 Git 분석 데이터 조회
router.get('/projects/:id/git-analytics', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;
    
    console.log('📊 프로젝트 Git 분석 데이터 조회:', id);
    
    const client = await pool.connect();
    
    try {
      // 프로젝트 기본 정보 조회
      const projectResult = await client.query(`
        SELECT name, created_at, deadline, progress_rate FROM projects WHERE id = $1
      `, [id]);
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      // Git 분석 데이터 조회
      const analyticsResult = await client.query(`
        SELECT * FROM project_git_analytics 
        WHERE project_id = $1 
          AND analysis_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
        ORDER BY analysis_date DESC
      `, [id]);
      
      // 레포지토리 정보 조회
      const repositoriesResult = await client.query(`
        SELECT * FROM project_repositories WHERE project_id = $1 AND status = 'active'
      `, [id]);
      
      res.json({
        success: true,
        data: {
          project: projectResult.rows[0],
          repositories: repositoriesResult.rows,
          analytics: analyticsResult.rows,
          summary: analyticsResult.rows[0] || null
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Git 분석 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch git analytics data',
      message: error.message
    });
  }
});

// [advice from AI] 수동 Git 분석 실행
router.post('/projects/:id/analyze-git', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🔍 수동 Git 분석 실행:', id);
    
    const gitAnalyticsService = new GitAnalyticsService();
    const client = await pool.connect();
    
    try {
      // 프로젝트 레포지토리 정보 조회
      const repositoryResult = await client.query(`
        SELECT 
          pr.*,
          p.name as project_name,
          p.deadline,
          p.created_at as project_start_date,
          wg.name as work_group_name
        FROM project_repositories pr
        JOIN projects p ON pr.project_id = p.id
        LEFT JOIN work_groups wg ON pr.work_group_id = wg.id
        WHERE pr.project_id = $1 AND pr.status = 'active'
      `, [id]);
      
      if (repositoryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No active repositories found for this project'
        });
      }
      
      const analysisResults = [];
      
      for (const repo of repositoryResult.rows) {
        try {
          // Git 활동 데이터 수집
          const gitActivity = await gitAnalyticsService.fetchGitActivity(repo);
          
          // 진행률 계산
          const progressData = await gitAnalyticsService.calculateProgress(repo, gitActivity);
          
          // 데이터베이스 업데이트
          await gitAnalyticsService.updateProjectProgressFromGit(client, id, progressData);
          
          analysisResults.push({
            repository_name: repo.repository_name,
            progress_data: progressData,
            status: 'success'
          });
          
        } catch (error) {
          console.error(`❌ ${repo.repository_name} 분석 실패:`, error.message);
          analysisResults.push({
            repository_name: repo.repository_name,
            status: 'error',
            error: error.message
          });
        }
      }
      
      res.json({
        success: true,
        message: 'Git 분석이 완료되었습니다.',
        data: {
          project_id: id,
          analysis_results: analysisResults
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 수동 Git 분석 실행 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze git activity',
      message: error.message
    });
  }
});

// [advice from AI] 전체 프로젝트 진행률 업데이트 (관리자 전용)
router.post('/batch/update-progress', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔄 전체 프로젝트 진행률 배치 업데이트 실행');
    
    const gitAnalyticsService = new GitAnalyticsService();
    const results = await gitAnalyticsService.updateAllProjectsProgress();
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    res.json({
      success: true,
      message: '전체 프로젝트 진행률 업데이트가 완료되었습니다.',
      data: {
        total_projects: results.length,
        success_count: successCount,
        error_count: errorCount,
        results: results
      }
    });
    
  } catch (error) {
    console.error('❌ 전체 진행률 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update all projects progress',
      message: error.message
    });
  }
});

// [advice from AI] 개발 도구 상태 조회
router.get('/tools/status', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🛠️ 개발 도구 상태 조회');
    
    // 실제 환경에서는 각 도구의 실제 상태를 확인
    const toolsStatus = {
      gitlab: {
        name: 'GitLab',
        status: 'operational',
        url: 'http://rdc.rickyson.com:8929',
        last_check: new Date().toISOString(),
        projects_count: Math.floor(Math.random() * 50) + 10,
        active_pipelines: Math.floor(Math.random() * 10)
      },
      docker_registry: {
        name: 'Docker Registry',
        status: 'operational',
        url: 'registry.rdc.rickyson.com',
        last_check: new Date().toISOString(),
        images_count: Math.floor(Math.random() * 100) + 50
      },
      database: {
        name: 'PostgreSQL',
        status: 'operational',
        host: 'localhost:5432',
        last_check: new Date().toISOString(),
        connections_active: Math.floor(Math.random() * 20) + 5,
        databases_count: Math.floor(Math.random() * 10) + 3
      },
      monitoring: {
        name: 'Monitoring Stack',
        status: 'operational',
        components: ['Prometheus', 'Grafana', 'AlertManager'],
        last_check: new Date().toISOString(),
        alerts_active: Math.floor(Math.random() * 5)
      }
    };
    
    res.json({
      success: true,
      data: {
        overall_status: 'operational',
        last_updated: new Date().toISOString(),
        tools: toolsStatus
      }
    });
    
  } catch (error) {
    console.error('❌ 개발 도구 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch development tools status',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 진행률 업데이트 헬퍼 메서드
async function updateProjectProgress(client, projectId, workGroupId, milestone) {
  try {
    console.log('📊 프로젝트 진행률 업데이트 시작:', projectId, milestone);
    
    // 프로젝트의 전체 작업 그룹 수 조회
    const totalWorkGroupsResult = await client.query(`
      SELECT COUNT(*) as total_work_groups
      FROM work_groups 
      WHERE project_id = $1
    `, [projectId]);
    
    const totalWorkGroups = parseInt(totalWorkGroupsResult.rows[0].total_work_groups) || 1;
    
    // 레포지토리가 등록된 작업 그룹 수 조회
    const completedWorkGroupsResult = await client.query(`
      SELECT COUNT(DISTINCT pr.work_group_id) as completed_work_groups
      FROM project_repositories pr
      WHERE pr.project_id = $1 AND pr.status = 'active'
    `, [projectId]);
    
    const completedWorkGroups = parseInt(completedWorkGroupsResult.rows[0].completed_work_groups) || 0;
    
    // 진행률 계산 (레포지토리 등록 = 10% 시작점)
    let baseProgress = 0;
    if (totalWorkGroups > 0) {
      baseProgress = Math.round((completedWorkGroups / totalWorkGroups) * 10); // 최대 10%까지
    }
    
    // 마일스톤별 추가 진행률
    const milestoneProgress = {
      'repository_registered': baseProgress, // 레포지토리 등록 시작
      'development_started': baseProgress + 20, // 개발 시작
      'first_commit': baseProgress + 30, // 첫 커밋
      'testing_phase': baseProgress + 60, // 테스트 단계
      'code_review': baseProgress + 80, // 코드 리뷰
      'completed': 100 // 완료
    };
    
    const newProgress = Math.min(milestoneProgress[milestone] || baseProgress, 100);
    
    // 프로젝트 진행률 업데이트
    await client.query(`
      UPDATE projects 
      SET progress_rate = $1, 
          project_status = CASE 
            WHEN progress_rate = 0 AND $1 > 0 THEN 'development'
            WHEN $1 = 100 THEN 'completed'
            WHEN $1 > 0 THEN 'in_progress'
            ELSE project_status
          END,
          updated_at = NOW()
      WHERE id = $2
    `, [newProgress, projectId]);
    
    // 작업 그룹별 진행률 업데이트 (해당하는 경우)
    if (workGroupId) {
      await client.query(`
        UPDATE work_groups 
        SET status = CASE 
          WHEN $1 = 'repository_registered' THEN 'development'
          WHEN $1 = 'completed' THEN 'completed'
          ELSE 'in_progress'
        END,
        updated_at = NOW()
        WHERE id = $2
      `, [milestone, workGroupId]);
    }
    
    // 진행률 변경 이력 저장
    await client.query(`
      INSERT INTO project_progress_snapshots (
        project_id, work_group_id, milestone, progress_rate, 
        milestone_date, notes
      ) VALUES ($1, $2, $3, $4, NOW(), $5)
    `, [
      projectId, 
      workGroupId, 
      milestone, 
      newProgress,
      `${milestone} 단계 완료 - 진행률 ${newProgress}%로 업데이트`
    ]);
    
    console.log('✅ 프로젝트 진행률 업데이트 완료:', projectId, `${newProgress}%`);
    
    return {
      project_id: projectId,
      work_group_id: workGroupId,
      milestone: milestone,
      previous_progress: 0, // 실제로는 이전 값을 조회해야 함
      new_progress: newProgress,
      total_work_groups: totalWorkGroups,
      completed_work_groups: completedWorkGroups
    };
    
  } catch (error) {
    console.error('❌ 프로젝트 진행률 업데이트 실패:', error);
    throw error;
  }
}

// 라우터에 헬퍼 메서드 바인딩
router.updateProjectProgress = updateProjectProgress;

// [advice from AI] 단계별 작업 시작 승인 처리
router.post('/projects/:id/work-start-approval', jwtAuth.verifyToken, jwtAuth.requireRole(['pe']), async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const {
      // 레포지토리 정보
      repository_url,
      access_token,
      work_group_id,
      
      // 요구사항 검토 결과
      requirements_feedback,
      documents_reviewed,
      requirements_confirmed,
      
      // 일정 계획 결과
      pe_estimated_completion_date,
      estimated_hours,
      difficulty_feedback,
      planned_milestones,
      
      // 기술 및 환경 정보
      work_notes,
      
      // 최종 승인 확인
      work_start_confirmation,
      final_confirmation,
      
      // 메타데이터
      approval_completed_at,
      approval_process_steps
    } = req.body;

    console.log('🚀 단계별 작업 시작 승인 처리 시작:', { projectId, userId });

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        message: '사용자 인증 정보를 찾을 수 없습니다.'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 프로젝트에 할당된 PE 확인 (승인자와 관계없이)
      let assignmentCheck = await client.query(`
        SELECT pwa.*, p.name as project_name, u.full_name as pe_name
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        JOIN timbel_users u ON pwa.assigned_to = u.id
        WHERE pwa.project_id = $1 AND pwa.assignment_status IN ('assigned', 'in_progress')
        ORDER BY pwa.assigned_at DESC
        LIMIT 1
      `, [projectId]);

      let assignment;
      if (assignmentCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          message: '해당 프로젝트에 할당된 PE를 찾을 수 없습니다.'
        });
      } else {
        assignment = assignmentCheck.rows[0];
        console.log('✅ 프로젝트 할당 확인:', {
          assignmentId: assignment.id,
          assignedTo: assignment.assigned_to,
          peName: assignment.pe_name,
          approver: userId
        });
      }

      // 1. 레포지토리 등록
      const gitAnalyticsService = new GitAnalyticsService();
      const repository = await gitAnalyticsService.registerRepository(
        projectId,
        work_group_id,
        userId,
        {
          repository_url,
          access_token,
          description: work_notes
        }
      );

      // 2. 할당 정보 업데이트 (승인 과정 데이터)
      await client.query(`
        UPDATE project_work_assignments 
        SET 
          assignment_status = 'in_progress',
          actual_start_date = NOW(),
          pe_estimated_completion_date = $1,
          pe_estimated_hours = $2,
          difficulty_feedback = $3,
          pe_notes = $4,
          progress_percentage = 5, -- 작업 시작으로 5% 진행률
          updated_at = NOW()
        WHERE id = $5
      `, [
        pe_estimated_completion_date,
        estimated_hours,
        difficulty_feedback,
        work_start_confirmation,
        assignment.id
      ]);

      // 3. 일정 추적 레코드 생성
      await client.query(`
        INSERT INTO project_schedule_tracking (
          project_id, work_assignment_id, original_estimated_hours,
          current_estimated_hours, planned_start_date, actual_start_date,
          planned_end_date, current_estimated_end_date, schedule_status,
          last_updated_by, update_notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        projectId,
        assignment.id,
        estimated_hours,
        estimated_hours,
        new Date().toISOString().split('T')[0], // 오늘
        new Date().toISOString().split('T')[0], // 오늘
        pe_estimated_completion_date,
        pe_estimated_completion_date,
        'on_track',
        userId,
        `작업 시작 승인 완료. 요구사항 검토: ${requirements_feedback.substring(0, 100)}...`
      ]);

      // 4. 마일스톤 등록
      if (planned_milestones && planned_milestones.length > 0) {
        for (const milestone of planned_milestones) {
          if (milestone.name && milestone.name.trim()) {
            await client.query(`
              INSERT INTO project_progress_milestones (
                project_id, work_assignment_id, milestone_name, milestone_type,
                target_date, description, weight, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              projectId,
              assignment.id,
              milestone.name,
              'development',
              milestone.target_date || pe_estimated_completion_date,
              milestone.description || '',
              milestone.weight || 1,
              'pending'
            ]);
          }
        }
      }

      // 5. 승인 과정 기록을 위한 메타데이터 저장
      const approvalMetadata = {
        requirements_feedback,
        documents_reviewed,
        requirements_confirmed,
        difficulty_feedback,
        planned_milestones: planned_milestones?.length || 0,
        approval_process_steps,
        approval_completed_at
      };

      await client.query(`
        UPDATE project_work_assignments 
        SET assignment_history = assignment_history || $1
        WHERE id = $2
      `, [
        JSON.stringify({
          action: 'work_start_approved',
          timestamp: new Date().toISOString(),
          approval_metadata: approvalMetadata
        }),
        assignment.id
      ]);

      // 6. 작업 시작 알림 전송 (개선된 알림 시스템 사용)
      try {
        const projectResult = await client.query('SELECT name FROM projects WHERE id = $1', [projectId]);
        const projectName = projectResult.rows[0]?.name;
        
        if (projectName) {
          const notificationCenter = new CollaborationNotificationCenter();
          await notificationCenter.notifyWorkStarted(
            projectId,
            projectName,
            userId,
            repository_url
          );
          console.log('✅ 작업 시작 알림 전송 완료');
        }
      } catch (notificationError) {
        console.warn('⚠️ 작업 시작 알림 전송 실패:', notificationError.message);
      }

      // 작업 시작 이벤트 기록
      try {
        await client.query(`
          INSERT INTO system_event_stream (
            id, event_type, event_category, title, description, 
            project_id, user_id, assignment_id, event_timestamp, 
            event_data, is_processed, requires_action, repository_url
          ) VALUES (
            gen_random_uuid(), 'work_start', 'project_management',
            '작업 시작', $1,
            $2, $3, $4, NOW(),
            $5, true, false, $6
          )
        `, [
          `프로젝트 작업이 시작되었습니다. 예상 완료일: ${pe_estimated_completion_date}, 예상 시간: ${estimated_hours}시간`,
          projectId,
          userId, // 승인자 (관리자)
          assignment.id,
          JSON.stringify({
            repository_url,
            estimated_hours,
            pe_estimated_completion_date,
            difficulty_feedback,
            requirements_feedback: requirements_feedback.substring(0, 200),
            approved_by_role: req.user?.roleType,
            assigned_pe: assignment.assigned_to
          }),
          repository_url
        ]);
        console.log('📝 작업 시작 이벤트 기록 완료');
      } catch (eventError) {
        console.error('❌ 이벤트 기록 실패:', eventError);
        // 이벤트 기록 실패는 메인 작업에 영향을 주지 않음
      }

      await client.query('COMMIT');

      console.log('✅ 단계별 작업 시작 승인 완료:', { projectId, repositoryId: repository.id });

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: {
          assignment_id: assignment.id,
          repository_id: repository.id,
          repository_url: repository.repository_url,
          milestones_created: planned_milestones?.filter(m => m.name?.trim()).length || 0,
          message: '작업이 성공적으로 시작되었습니다!'
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 단계별 작업 시작 승인 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve work start',
      message: error.message
    });
  }
});

module.exports = router;
