// [advice from AI] 레포지토리 관리 API
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const RepositoryAnalyzer = require('../services/repositoryAnalyzer');
const { v4: uuidv4 } = require('uuid');

// [advice from AI] PostgreSQL 연결 설정
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || '1q2w3e4r',
  port: process.env.DB_PORT || 5432,
});

const repositoryAnalyzer = new RepositoryAnalyzer();

// [advice from AI] 레포지토리 목록 조회
router.get('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations', 'po', 'pe']), async (req, res) => {
  try {
    console.log('📋 레포지토리 목록 조회');
    
    const query = `
      SELECT 
        id, name, description, repository_url, branch, 
        project_type, framework, language, build_tool,
        deployment_config, tech_stack, auto_detected_info,
        created_by, created_at, updated_at, status
      FROM repositories 
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: {
        repositories: result.rows,
        total: result.rows.length
      }
    });
    
  } catch (error) {
    console.error('❌ 레포지토리 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '레포지토리 목록 조회 실패'
    });
  }
});

// [advice from AI] 레포지토리 분석 (등록 전 미리보기)
router.post('/analyze', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations', 'po', 'pe']), async (req, res) => {
  try {
    const { repository_url } = req.body;
    
    if (!repository_url) {
      return res.status(400).json({
        success: false,
        message: '레포지토리 URL이 필요합니다.'
      });
    }
    
    console.log('🔍 레포지토리 분석 요청:', repository_url);
    
    const analysis = await repositoryAnalyzer.analyzeRepository(repository_url);
    
    // [advice from AI] 분석 결과를 기반으로 자동 입력 데이터 생성
    const autoFillData = {
      name: analysis.basic?.name || '',
      description: analysis.basic?.description || '',
      language: analysis.basic?.language || analysis.autoDetected?.projectType || '',
      framework: analysis.autoDetected?.framework || '',
      project_type: analysis.autoDetected?.projectType || '',
      build_tool: analysis.autoDetected?.buildTool || '',
      default_branch: analysis.basic?.defaultBranch || 'main',
      
      // 배포 설정
      deployment_config: {
        build_command: analysis.deploymentConfig?.buildCommand || 'npm run build',
        start_command: analysis.deploymentConfig?.startCommand || 'npm start',
        port: analysis.deploymentConfig?.port || 3000,
        health_check_path: analysis.deploymentConfig?.healthCheckPath || '/health',
        environment_variables: analysis.autoDetected?.environment || [],
        resource_requirements: analysis.deploymentConfig?.resourceRequirements || {
          cpu: '500m',
          memory: '512Mi'
        }
      },
      
      // 기술 스택
      tech_stack: analysis.techStack || {},
      
      // 자동 감지된 정보 (참고용)
      auto_detected_info: {
        analysis_timestamp: new Date().toISOString(),
        detected_ports: analysis.autoDetected?.ports || [],
        detected_databases: analysis.autoDetected?.database || [],
        has_dockerfile: analysis.fileStructure?.hasDockerfile || false,
        has_docker_compose: analysis.fileStructure?.hasDockerCompose || false,
        has_kubernetes: analysis.fileStructure?.hasKubernetesFiles || false,
        has_jenkinsfile: analysis.fileStructure?.hasJenkinsfile || false,
        package_info: analysis.packageInfo ? {
          name: analysis.packageInfo.name,
          version: analysis.packageInfo.version,
          scripts: Object.keys(analysis.packageInfo.scripts || {}),
          dependencies: Object.keys(analysis.packageInfo.dependencies || {}).slice(0, 10) // 상위 10개만
        } : null,
        readme_analysis: analysis.readme ? {
          has_installation_guide: !!analysis.readme.analysis?.installation?.length,
          has_usage_guide: !!analysis.readme.analysis?.usage,
          has_deployment_guide: !!analysis.readme.analysis?.deployment,
          detected_ports: analysis.readme.analysis?.ports || [],
          detected_env_vars: analysis.readme.analysis?.environment?.map(env => env.name) || []
        } : null
      }
    };
    
    res.json({
      success: true,
      data: {
        analysis: analysis,
        autoFillData: autoFillData,
        suggestions: {
          ci_cd_pipeline: analysis.fileStructure?.hasJenkinsfile ? 'Jenkins (Jenkinsfile 감지됨)' : 'GitHub Actions 권장',
          containerization: analysis.fileStructure?.hasDockerfile ? 'Docker 설정 완료' : 'Dockerfile 생성 필요',
          deployment_strategy: analysis.fileStructure?.hasKubernetesFiles ? 'Kubernetes' : 'Docker Compose',
          monitoring: '프로메테우스 + 그라파나 권장',
          database: analysis.autoDetected?.database?.length > 0 ? 
            `감지된 DB: ${analysis.autoDetected.database.join(', ')}` : 
            '데이터베이스 설정 확인 필요'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ 레포지토리 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Repository Analysis Failed',
      message: error.message
    });
  }
});

// [advice from AI] 레포지토리 등록
router.post('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations', 'po', 'pe']), async (req, res) => {
  try {
    const {
      name,
      description,
      repository_url,
      branch = 'main',
      project_type,
      framework,
      language,
      build_tool,
      deployment_config,
      tech_stack,
      auto_detected_info,
      project_id = null // 프로젝트와 연결하는 경우
    } = req.body;
    
    if (!name || !repository_url) {
      return res.status(400).json({
        success: false,
        message: '레포지토리 이름과 URL은 필수입니다.'
      });
    }
    
    console.log('📝 레포지토리 등록:', { name, repository_url, project_type });
    
    const id = uuidv4();
    const query = `
      INSERT INTO repositories (
        id, name, description, repository_url, branch,
        project_type, framework, language, build_tool,
        deployment_config, tech_stack, auto_detected_info,
        project_id, created_by, created_at, updated_at, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), 'active'
      ) RETURNING *
    `;
    
    const values = [
      id, name, description, repository_url, branch,
      project_type, framework, language, build_tool,
      JSON.stringify(deployment_config || {}),
      JSON.stringify(tech_stack || {}),
      JSON.stringify(auto_detected_info || {}),
      project_id, req.user.id
    ];
    
    const result = await pool.query(query, values);
    
    res.status(201).json({
      success: true,
      message: '레포지토리 등록 성공',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ 레포지토리 등록 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '레포지토리 등록 실패'
    });
  }
});

// [advice from AI] 레포지토리 상세 조회
router.get('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations', 'po', 'pe']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT r.*, p.name as project_name, p.description as project_description
      FROM repositories r
      LEFT JOIN projects p ON r.project_id = p.id
      WHERE r.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '레포지토리를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ 레포지토리 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '레포지토리 상세 조회 실패'
    });
  }
});

// [advice from AI] 레포지토리 수정
router.put('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations', 'po', 'pe']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      branch,
      project_type,
      framework,
      language,
      build_tool,
      deployment_config,
      tech_stack,
      status
    } = req.body;
    
    const query = `
      UPDATE repositories SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        branch = COALESCE($4, branch),
        project_type = COALESCE($5, project_type),
        framework = COALESCE($6, framework),
        language = COALESCE($7, language),
        build_tool = COALESCE($8, build_tool),
        deployment_config = COALESCE($9, deployment_config),
        tech_stack = COALESCE($10, tech_stack),
        status = COALESCE($11, status),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id, name, description, branch, project_type, framework, language, build_tool,
      deployment_config ? JSON.stringify(deployment_config) : null,
      tech_stack ? JSON.stringify(tech_stack) : null,
      status
    ];
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '레포지토리를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '레포지토리 수정 성공',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ 레포지토리 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '레포지토리 수정 실패'
    });
  }
});

// [advice from AI] 레포지토리 삭제
router.delete('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM repositories WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '레포지토리를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      message: '레포지토리 삭제 성공',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ 레포지토리 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '레포지토리 삭제 실패'
    });
  }
});

// [advice from AI] 프로젝트별 레포지토리 조회
router.get('/project/:projectId', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations', 'po', 'pe']), async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const query = `
      SELECT * FROM repositories 
      WHERE project_id = $1 AND status = 'active'
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [projectId]);
    
    res.json({
      success: true,
      data: {
        repositories: result.rows,
        total: result.rows.length
      }
    });
    
  } catch (error) {
    console.error('❌ 프로젝트별 레포지토리 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '프로젝트별 레포지토리 조회 실패'
    });
  }
});

module.exports = router;
