// [advice from AI] CI/CD 파이프라인 관리 API
// GitHub → Jenkins → Nexus → Argo CD 전체 파이프라인 통합 관리

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const JenkinsIntegration = require('../services/jenkinsIntegration');
const { authenticateToken, requireRole } = require('../middleware/auth');

// PostgreSQL 연결
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// Jenkins 서비스 인스턴스
const jenkinsService = new JenkinsIntegration();

// [advice from AI] 파이프라인 목록 조회
router.get('/pipelines', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 CI/CD 파이프라인 목록 조회 시작...');
    
    const query = `
      SELECT 
        id,
        project_name,
        repository_url,
        branch,
        jenkins_job_name,
        build_number,
        build_status,
        image_tag,
        deployment_status,
        dockerfile_path,
        deployment_environment,
        created_at,
        updated_at
      FROM cicd_pipelines 
      ORDER BY updated_at DESC
    `;
    
    const result = await pool.query(query);
    
    console.log(`✅ 파이프라인 목록 조회 완료: ${result.rows.length}개`);
    
    res.json({
      success: true,
      data: result.rows,
      message: '파이프라인 목록을 성공적으로 조회했습니다.'
    });
    
  } catch (error) {
    console.error('❌ 파이프라인 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 새 파이프라인 생성
router.post('/pipelines', authenticateToken, requireRole(['admin', 'po']), async (req, res) => {
  try {
    console.log('🚀 새 CI/CD 파이프라인 생성 시작...');
    
    const {
      project_name,
      repository_url,
      branch = 'main',
      dockerfile_path = 'Dockerfile',
      deployment_environment = 'development'
    } = req.body;
    
    // 필수 필드 검증
    if (!project_name || !repository_url) {
      return res.status(400).json({
        success: false,
        message: '프로젝트명과 저장소 URL은 필수입니다.'
      });
    }
    
    const pipelineId = uuidv4();
    const jenkinsJobName = `${project_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${branch}`;
    
    // 데이터베이스에 파이프라인 정보 저장
    const insertQuery = `
      INSERT INTO cicd_pipelines (
        id, project_name, repository_url, branch, jenkins_job_name,
        dockerfile_path, deployment_environment, build_status, deployment_status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      pipelineId,
      project_name,
      repository_url,
      branch,
      jenkinsJobName,
      dockerfile_path,
      deployment_environment,
      'pending',
      'pending'
    ];
    
    const result = await pool.query(insertQuery, values);
    
    // Jenkins Job 생성 시도
    try {
      await jenkinsService.createPipelineJob({
        jobName: jenkinsJobName,
        repositoryUrl: repository_url,
        branch: branch,
        dockerfilePath: dockerfile_path
      });
      
      console.log(`✅ Jenkins Job 생성 완료: ${jenkinsJobName}`);
    } catch (jenkinsError) {
      console.warn('⚠️ Jenkins Job 생성 실패 (파이프라인은 생성됨):', jenkinsError.message);
    }
    
    console.log(`✅ 파이프라인 생성 완료: ${project_name}`);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'CI/CD 파이프라인이 성공적으로 생성되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ 파이프라인 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 파이프라인 트리거 (빌드 시작)
router.post('/pipelines/:id/trigger', authenticateToken, requireRole(['admin', 'po']), async (req, res) => {
  try {
    console.log('🔥 파이프라인 트리거 시작...');
    
    const { id } = req.params;
    
    // 파이프라인 정보 조회
    const pipelineQuery = 'SELECT * FROM cicd_pipelines WHERE id = $1';
    const pipelineResult = await pool.query(pipelineQuery, [id]);
    
    if (pipelineResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '파이프라인을 찾을 수 없습니다.'
      });
    }
    
    const pipeline = pipelineResult.rows[0];
    
    // 빌드 상태를 'running'으로 업데이트
    const updateQuery = `
      UPDATE cicd_pipelines 
      SET build_status = 'running', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    await pool.query(updateQuery, [id]);
    
    // Jenkins 빌드 트리거
    try {
      const buildResult = await jenkinsService.triggerBuild({
        jobName: pipeline.jenkins_job_name,
        parameters: {
          REPOSITORY_URL: pipeline.repository_url,
          BRANCH: pipeline.branch,
          DOCKERFILE_PATH: pipeline.dockerfile_path,
          DEPLOYMENT_ENV: pipeline.deployment_environment
        }
      });
      
      // 빌드 번호 업데이트
      if (buildResult.buildNumber) {
        await pool.query(
          'UPDATE cicd_pipelines SET build_number = $1 WHERE id = $2',
          [buildResult.buildNumber, id]
        );
      }
      
      console.log(`✅ Jenkins 빌드 트리거 완료: ${pipeline.jenkins_job_name} #${buildResult.buildNumber}`);
      
    } catch (jenkinsError) {
      console.error('❌ Jenkins 빌드 트리거 실패:', jenkinsError);
      
      // 빌드 상태를 'failed'로 업데이트
      await pool.query(
        'UPDATE cicd_pipelines SET build_status = $1 WHERE id = $2',
        ['failed', id]
      );
      
      return res.status(500).json({
        success: false,
        message: 'Jenkins 빌드 트리거에 실패했습니다.',
        error: jenkinsError.message
      });
    }
    
    res.json({
      success: true,
      message: '파이프라인이 성공적으로 트리거되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ 파이프라인 트리거 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 트리거 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 파이프라인 상태 업데이트 (Jenkins webhook용)
router.post('/pipelines/:id/status', async (req, res) => {
  try {
    console.log('📡 파이프라인 상태 업데이트 수신...');
    
    const { id } = req.params;
    const { build_status, build_number, image_tag, deployment_status } = req.body;
    
    const updateFields = [];
    const values = [];
    let paramIndex = 1;
    
    if (build_status) {
      updateFields.push(`build_status = $${paramIndex++}`);
      values.push(build_status);
    }
    
    if (build_number) {
      updateFields.push(`build_number = $${paramIndex++}`);
      values.push(build_number);
    }
    
    if (image_tag) {
      updateFields.push(`image_tag = $${paramIndex++}`);
      values.push(image_tag);
    }
    
    if (deployment_status) {
      updateFields.push(`deployment_status = $${paramIndex++}`);
      values.push(deployment_status);
    }
    
    updateFields.push(`updated_at = NOW()`);
    values.push(id);
    
    const updateQuery = `
      UPDATE cicd_pipelines 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '파이프라인을 찾을 수 없습니다.'
      });
    }
    
    console.log(`✅ 파이프라인 상태 업데이트 완료: ${id}`);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: '파이프라인 상태가 업데이트되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ 파이프라인 상태 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 상태 업데이트 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] CI/CD 설정 조회
router.get('/config', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🔧 CI/CD 설정 조회 시작...');
    
    // 환경변수에서 설정 정보 조회 (보안상 토큰/비밀번호는 마스킹)
    const config = {
      jenkins_url: process.env.JENKINS_URL || '',
      jenkins_username: process.env.JENKINS_USER || '',
      jenkins_token: process.env.JENKINS_TOKEN ? '***configured***' : '',
      nexus_url: process.env.NEXUS_URL || '',
      nexus_username: process.env.NEXUS_USER || '',
      nexus_password: process.env.NEXUS_PASSWORD ? '***configured***' : '',
      argocd_url: process.env.ARGOCD_URL || '',
      argocd_username: process.env.ARGOCD_USER || '',
      argocd_password: process.env.ARGOCD_PASSWORD ? '***configured***' : '',
      github_token: process.env.GITHUB_TOKEN ? '***configured***' : ''
    };
    
    res.json({
      success: true,
      data: config,
      message: 'CI/CD 설정을 성공적으로 조회했습니다.'
    });
    
  } catch (error) {
    console.error('❌ CI/CD 설정 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: 'CI/CD 설정 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 파이프라인 삭제
router.delete('/pipelines/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    console.log('🗑️ 파이프라인 삭제 시작...');
    
    const { id } = req.params;
    
    // 파이프라인 정보 조회
    const pipelineQuery = 'SELECT * FROM cicd_pipelines WHERE id = $1';
    const pipelineResult = await pool.query(pipelineQuery, [id]);
    
    if (pipelineResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '파이프라인을 찾을 수 없습니다.'
      });
    }
    
    const pipeline = pipelineResult.rows[0];
    
    // Jenkins Job 삭제 시도
    try {
      await jenkinsService.deleteJob(pipeline.jenkins_job_name);
      console.log(`✅ Jenkins Job 삭제 완료: ${pipeline.jenkins_job_name}`);
    } catch (jenkinsError) {
      console.warn('⚠️ Jenkins Job 삭제 실패:', jenkinsError.message);
    }
    
    // 데이터베이스에서 파이프라인 삭제
    const deleteQuery = 'DELETE FROM cicd_pipelines WHERE id = $1';
    await pool.query(deleteQuery, [id]);
    
    console.log(`✅ 파이프라인 삭제 완료: ${pipeline.project_name}`);
    
    res.json({
      success: true,
      message: '파이프라인이 성공적으로 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ 파이프라인 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
