// [advice from AI] CI/CD 파이프라인 관리 API
// GitHub → Jenkins → Nexus → Argo CD 전체 파이프라인 통합 관리

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const JenkinsIntegration = require('../services/jenkinsIntegration');
const jwtAuth = require('../middleware/jwtAuth');
const advancedPermissions = require('./advanced-permissions');

// PostgreSQL 연결 - jenkins_jobs 테이블이 있는 timbel_cicd_operator 데이터베이스에 연결
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: 'timbel_cicd_operator', // [advice from AI] jenkins_jobs 테이블이 있는 운영센터 데이터베이스
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// Jenkins 서비스 인스턴스
const jenkinsService = new JenkinsIntegration();

// [advice from AI] 파이프라인 목록 조회
router.get('/pipelines', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 CI/CD 파이프라인 목록 조회 시작...');
    console.log('🔑 사용자 정보:', req.user?.username || 'unknown');
    console.log('🔗 데이터베이스 연결 풀 상태:', pool.totalCount, '/', pool.idleCount);
    
    const query = `
      SELECT 
        pe.id,
        pe.pipeline_id,
        pe.repository,
        pe.branch,
        pe.provider_name as pipeline_type,
        pe.environment,
        pe.status,
        pe.current_stage,
        pe.config,
        pe.created_at,
        pe.updated_at,
        pe.started_at,
        pe.completed_at,
        pt.name as template_name,
        pt.description as template_description
      FROM pipeline_executions pe
      LEFT JOIN pipeline_templates pt ON pe.template_id = pt.id
      ORDER BY pe.created_at DESC
      LIMIT 50
    `;
    
    console.log('📝 실행할 쿼리:', query.replace(/\s+/g, ' ').trim());
    
    const result = await pool.query(query);
    
    console.log(`✅ 파이프라인 목록 조회 완료: ${result.rows.length}개`);
    console.log('📊 첫 번째 데이터:', result.rows[0] ? result.rows[0].pipeline_name : 'no data');
    
    res.json({
      success: true,
      data: result.rows,
      message: '파이프라인 목록을 성공적으로 조회했습니다.'
    });
    
  } catch (error) {
    console.error('❌ 파이프라인 목록 조회 실패:', error);
    console.error('❌ 오류 스택:', error.stack);
    console.error('❌ 데이터베이스 설정:', {
      user: pool.options.user,
      host: pool.options.host,
      database: pool.options.database,
      port: pool.options.port
    });
    res.status(500).json({
      success: false,
      message: '파이프라인 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 새 파이프라인 생성
router.post('/pipelines', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_pipelines'), async (req, res) => {
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
router.post('/pipelines/:id/trigger', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_deploy_services'), async (req, res) => {
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
router.get('/config', jwtAuth.verifyToken, async (req, res) => {
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
router.delete('/pipelines/:id', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_pipelines'), async (req, res) => {
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

// [advice from AI] Jenkins 서버 상태 확인
router.get('/jenkins/health', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 Jenkins 서버 상태 확인...');
    
    const healthStatus = await jenkinsService.checkJenkinsHealth();
    
    res.json({
      success: true,
      data: healthStatus,
      message: 'Jenkins 서버 상태 조회 완료'
    });
    
  } catch (error) {
    console.error('❌ Jenkins 서버 상태 확인 실패:', error);
    res.status(500).json({
      success: false,
      message: 'Jenkins 서버 상태 확인 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] Jenkins Job 목록 조회 - 프로덕션 레벨 (실제 데이터)
router.get('/jenkins/jobs', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 Jenkins Job 목록 조회 (실제 데이터)...');
    
    // [advice from AI] 데이터베이스에서 Jenkins Job 정보 조회 (실제 테이블 구조 기반)
    const dbJobsResult = await pool.query(`
      SELECT 
        jj.id,
        jj.job_name,
        jj.project_name,
        jj.repository_url,
        jj.branch_name,
        jj.build_number,
        jj.job_status,
        jj.build_duration,
        jj.artifacts,
        jj.created_at,
        jj.updated_at,
        jj.started_at,
        jj.completed_at
      FROM jenkins_jobs jj
      ORDER BY jj.updated_at DESC
    `);

    const dbJobs = dbJobsResult.rows.map(job => ({
      id: job.id,
      name: job.job_name,
      project_name: job.project_name,
      repository_url: job.repository_url,
      branch_name: job.branch_name,
      status: job.job_status || 'unknown',
      url: job.repository_url ? `http://jenkins.company.com/job/${job.job_name}/` : null,
      buildable: true,
      lastBuild: job.build_number ? {
        number: job.build_number,
        result: job.job_status,
        timestamp: job.completed_at || job.started_at,
        duration: job.build_duration,
        url: `http://jenkins.company.com/job/${job.job_name}/${job.build_number}/`
      } : null,
      artifacts: job.artifacts || [],
      created_at: job.created_at,
      updated_at: job.updated_at,
      started_at: job.started_at,
      completed_at: job.completed_at
    }));

    // [advice from AI] Jenkins 서버에서 실시간 상태 업데이트 시도 (비동기)
    try {
      const jenkinsJobs = await jenkinsService.listJenkinsJobs();
      
      // [advice from AI] 실시간 데이터로 DB 업데이트 (백그라운드) - 실제 테이블 구조 기반
      jenkinsJobs.jobs.forEach(async (job) => {
        try {
          await pool.query(`
            INSERT INTO jenkins_jobs (
              job_name, repository_url, job_status, 
              build_number, build_duration, started_at, completed_at,
              created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (job_name) DO UPDATE SET
              repository_url = EXCLUDED.repository_url,
              job_status = EXCLUDED.job_status,
              build_number = EXCLUDED.build_number,
              build_duration = EXCLUDED.build_duration,
              started_at = EXCLUDED.started_at,
              completed_at = EXCLUDED.completed_at,
              updated_at = NOW()
          `, [
            job.name,
            job.url,
            job.status,
            job.lastBuild?.number,
            null, // build_duration은 Jenkins API에서 직접 제공되지 않음
            job.lastBuild?.timestamp ? new Date(job.lastBuild.timestamp) : null,
            job.lastBuild?.timestamp ? new Date(job.lastBuild.timestamp) : null
          ]);
        } catch (updateError) {
          console.warn('Jenkins Job DB 업데이트 실패:', job.name, updateError.message);
        }
      });

      // [advice from AI] Jenkins 실시간 데이터 반환
      res.json({
        success: true,
        data: jenkinsJobs.jobs,
        message: 'Jenkins Job 목록 조회 완료 (실시간 데이터)',
        source: 'jenkins_live'
      });
      
    } catch (jenkinsError) {
      console.warn('⚠️ Jenkins 서버 연결 실패, DB 데이터 사용:', jenkinsError.message);
      
      // [advice from AI] Jenkins 연결 실패 시 DB 데이터 반환
      res.json({
        success: true,
        data: dbJobs,
        message: 'Jenkins Job 목록 조회 완료 (DB 데이터)',
        source: 'database',
        warning: 'Jenkins 서버 연결 불가'
      });
    }
    
  } catch (error) {
    console.error('❌ Jenkins Job 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: 'Jenkins Job 목록 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] Jenkins Job 생성
router.post('/jenkins/jobs', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_pipelines'), async (req, res) => {
  try {
    const { jobName, jobConfig } = req.body;
    
    if (!jobName || !jobConfig) {
      return res.status(400).json({
        success: false,
        message: 'jobName과 jobConfig가 필요합니다.'
      });
    }
    
    console.log(`🔨 Jenkins Job 생성 요청: ${jobName}`);
    
    const result = await jenkinsService.createJenkinsJob(jobName, jobConfig);
    
    // 데이터베이스에 파이프라인 정보 저장
    const pipelineId = uuidv4();
    await pool.query(`
      INSERT INTO cicd_pipelines (
        id, name, description, repository_url, branch, 
        jenkins_job_name, status, created_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      pipelineId,
      jobName,
      `Jenkins Job: ${jobName}`,
      jobConfig.githubUrl || '',
      jobConfig.branch || 'main',
      jobName,
      'active',
      req.user.userId
    ]);
    
    res.json({
      success: true,
      data: {
        pipelineId,
        ...result
      },
      message: 'Jenkins Job이 성공적으로 생성되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ Jenkins Job 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: 'Jenkins Job 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] Jenkins Job 빌드 트리거
router.post('/jenkins/jobs/:jobName/build', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_deploy_services'), async (req, res) => {
  try {
    const { jobName } = req.params;
    const { parameters = {} } = req.body;
    
    console.log(`🚀 Jenkins 빌드 트리거: ${jobName}`);
    
    const result = await jenkinsService.triggerJenkinsBuild(jobName, parameters);
    
    // 빌드 히스토리 저장
    await pool.query(`
      INSERT INTO cicd_build_history (
        id, pipeline_id, build_number, status, 
        started_by, started_at, jenkins_build_url
      ) VALUES ($1, 
        (SELECT id FROM cicd_pipelines WHERE jenkins_job_name = $2 LIMIT 1),
        $3, $4, $5, NOW(), $6
      )
    `, [
      uuidv4(),
      jobName,
      result.buildNumber,
      'running',
      req.user.userId,
      result.buildUrl
    ]);
    
    res.json({
      success: true,
      data: result,
      message: '빌드가 성공적으로 시작되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ Jenkins 빌드 트리거 실패:', error);
    res.status(500).json({
      success: false,
      message: 'Jenkins 빌드 트리거 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] Jenkins Job 상태 조회
router.get('/jenkins/jobs/:jobName/status', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { jobName } = req.params;
    
    console.log(`🔍 Jenkins Job 상태 조회: ${jobName}`);
    
    const result = await jenkinsService.getJobStatus(jobName);
    
    res.json({
      success: true,
      data: result.status,
      message: 'Jenkins Job 상태 조회 완료'
    });
    
  } catch (error) {
    console.error('❌ Jenkins Job 상태 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: 'Jenkins Job 상태 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] Jenkins Job 삭제
router.delete('/jenkins/jobs/:jobName', jwtAuth.verifyToken, advancedPermissions.checkAdvancedPermission('can_manage_pipelines'), async (req, res) => {
  try {
    const { jobName } = req.params;
    
    console.log(`🗑️ Jenkins Job 삭제: ${jobName}`);
    
    const result = await jenkinsService.deleteJenkinsJob(jobName);
    
    // 데이터베이스에서 파이프라인 정보 삭제
    await pool.query(`
      UPDATE cicd_pipelines 
      SET status = 'deleted', updated_at = NOW() 
      WHERE jenkins_job_name = $1
    `, [jobName]);
    
    res.json({
      success: true,
      data: result,
      message: 'Jenkins Job이 성공적으로 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ Jenkins Job 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: 'Jenkins Job 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
