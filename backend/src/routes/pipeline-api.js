// [advice from AI] 실제 파이프라인 목록 API - 프로덕션 레벨
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

// PostgreSQL 연결
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

/**
 * 파이프라인 목록 조회 API
 * GET /api/operations/cicd/pipelines
 */
router.get('/pipelines', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 파이프라인 목록 조회 시작...');
    console.log('🔑 사용자:', req.user?.username || 'unknown');
    
    const {
      status,
      environment,
      pipeline_type,
      page = 1,
      limit = 20
    } = req.query;

    // 필터 조건 구성
    let whereConditions = [];
    let queryParams = [];
    let paramCounter = 1;

    if (status) {
      whereConditions.push(`p.status = $${paramCounter}`);
      queryParams.push(status);
      paramCounter++;
    }

    if (environment) {
      whereConditions.push(`p.environment = $${paramCounter}`);
      queryParams.push(environment);
      paramCounter++;
    }

    if (pipeline_type) {
      whereConditions.push(`p.pipeline_type = $${paramCounter}`);
      queryParams.push(pipeline_type);
      paramCounter++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // 페이징 처리
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const limitClause = `LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
    queryParams.push(parseInt(limit), offset);

    // 메인 쿼리
    const query = `
      SELECT 
        p.id,
        p.pipeline_name,
        p.pipeline_type,
        p.environment,
        p.deployment_strategy,
        p.status,
        p.last_status,
        p.config,
        p.created_at,
        p.updated_at,
        -- 최근 배포 정보
        d.deployment_name as last_deployment_name,
        d.status as last_deployment_status,
        d.created_at as last_deployment_time,
        -- 파이프라인 스테이지 개수
        (SELECT COUNT(*) FROM operations_pipeline_stages s WHERE s.pipeline_id = p.id) as stage_count,
        -- 마지막 실행 스테이지 정보
        (
          SELECT json_agg(
            json_build_object(
              'stage_name', s.stage_name,
              'status', s.status,
              'stage_order', s.stage_order
            ) ORDER BY s.stage_order
          )
          FROM operations_pipeline_stages s 
          WHERE s.pipeline_id = p.id
        ) as stages
      FROM operations_pipelines p
      LEFT JOIN deployments d ON d.jenkins_job_name = (p.config->>'jenkins_job_name')
        AND d.created_at = (
          SELECT MAX(d2.created_at) 
          FROM deployments d2 
          WHERE d2.jenkins_job_name = (p.config->>'jenkins_job_name')
        )
      ${whereClause}
      ORDER BY p.updated_at DESC, p.created_at DESC
      ${limitClause}
    `;

    console.log('📝 실행할 쿼리:', query.replace(/\s+/g, ' ').trim());
    console.log('📝 쿼리 파라미터:', queryParams);

    const result = await pool.query(query, queryParams);

    // 전체 개수 조회
    const countQuery = `
      SELECT COUNT(*) as total
      FROM operations_pipelines p
      ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, queryParams.slice(0, -2)); // limit, offset 제외
    const totalCount = parseInt(countResult.rows[0].total);

    console.log(`✅ 파이프라인 목록 조회 완료: ${result.rows.length}개 (전체: ${totalCount}개)`);

    // 응답 데이터 가공
    const pipelines = result.rows.map(row => ({
      id: row.id,
      pipeline_name: row.pipeline_name,
      pipeline_type: row.pipeline_type,
      environment: row.environment,
      deployment_strategy: row.deployment_strategy,
      status: row.status,
      last_status: row.last_status,
      config: row.config,
      created_at: row.created_at,
      updated_at: row.updated_at,
      stage_count: parseInt(row.stage_count) || 0,
      stages: row.stages || [],
      last_deployment: row.last_deployment_name ? {
        name: row.last_deployment_name,
        status: row.last_deployment_status,
        time: row.last_deployment_time
      } : null
    }));

    res.json({
      success: true,
      data: pipelines,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_count: totalCount,
        total_pages: Math.ceil(totalCount / parseInt(limit))
      },
      filters: {
        status,
        environment,
        pipeline_type
      },
      message: '파이프라인 목록을 성공적으로 조회했습니다.'
    });

  } catch (error) {
    console.error('❌ 파이프라인 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 목록 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 특정 파이프라인 상세 조회 API
 * GET /api/operations/cicd/pipelines/:id
 */
router.get('/pipelines/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 파이프라인 상세 조회: ${id}`);

    const query = `
      SELECT 
        p.*,
        -- 스테이지 정보
        (
          SELECT json_agg(
            json_build_object(
              'id', s.id,
              'stage_name', s.stage_name,
              'stage_order', s.stage_order,
              'status', s.status,
              'config', s.config,
              'created_at', s.created_at,
              'updated_at', s.updated_at
            ) ORDER BY s.stage_order
          )
          FROM operations_pipeline_stages s 
          WHERE s.pipeline_id = p.id
        ) as stages,
        -- 최근 배포 기록 (최대 5개)
        (
          SELECT json_agg(
            json_build_object(
              'id', d.id,
              'deployment_name', d.deployment_name,
              'status', d.status,
              'progress_percentage', d.progress_percentage,
              'created_at', d.created_at,
              'started_at', d.started_at,
              'completed_at', d.completed_at
            ) ORDER BY d.created_at DESC
          )
          FROM (
            SELECT * FROM deployments 
            WHERE jenkins_job_name = (p.config->>'jenkins_job_name')
            ORDER BY created_at DESC 
            LIMIT 5
          ) d
        ) as recent_deployments
      FROM operations_pipelines p
      WHERE p.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '파이프라인을 찾을 수 없습니다.'
      });
    }

    const pipeline = {
      ...result.rows[0],
      stages: result.rows[0].stages || [],
      recent_deployments: result.rows[0].recent_deployments || []
    };

    console.log(`✅ 파이프라인 상세 조회 완료: ${pipeline.pipeline_name}`);

    res.json({
      success: true,
      data: pipeline,
      message: '파이프라인 상세 정보를 성공적으로 조회했습니다.'
    });

  } catch (error) {
    console.error('❌ 파이프라인 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 상세 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 파이프라인 실행 API
 * POST /api/operations/cicd/pipelines/:id/run
 */
router.post('/pipelines/:id/run', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { parameters = {} } = req.body;
    
    console.log(`🚀 파이프라인 실행 시작: ${id}`, parameters);

    // 파이프라인 정보 조회
    const pipelineResult = await pool.query(
      'SELECT * FROM operations_pipelines WHERE id = $1',
      [id]
    );

    if (pipelineResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '파이프라인을 찾을 수 없습니다.'
      });
    }

    const pipeline = pipelineResult.rows[0];
    const config = pipeline.config;

    // Jenkins 서비스 연동
    const JenkinsIntegration = require('../services/jenkinsIntegration');
    const jenkins = new JenkinsIntegration();

    try {
      // Jenkins 빌드 실행
      const buildResult = await jenkins.triggerJenkinsBuild(
        config.jenkins_job_name,
        {
          REPOSITORY_URL: config.repository_url,
          BRANCH: config.branch || 'main',
          ENVIRONMENT: pipeline.environment,
          ...parameters
        }
      );

      // 파이프라인 상태 업데이트
      await pool.query(
        'UPDATE operations_pipelines SET status = $1, last_status = $2, updated_at = NOW() WHERE id = $3',
        ['running', 'triggered', id]
      );

      // 스테이지 상태 초기화
      await pool.query(
        'UPDATE operations_pipeline_stages SET status = $1 WHERE pipeline_id = $2',
        ['pending', id]
      );

      console.log(`✅ 파이프라인 실행 완료: ${pipeline.pipeline_name}`);

      res.json({
        success: true,
        data: {
          pipeline_id: id,
          pipeline_name: pipeline.pipeline_name,
          jenkins_build: buildResult,
          status: 'running'
        },
        message: '파이프라인이 성공적으로 실행되었습니다.'
      });

    } catch (jenkinsError) {
      console.error('❌ Jenkins 빌드 실행 실패:', jenkinsError);
      
      // 파이프라인 실패 상태로 업데이트
      await pool.query(
        'UPDATE operations_pipelines SET status = $1, last_status = $2, updated_at = NOW() WHERE id = $3',
        ['failed', 'jenkins_error', id]
      );

      return res.status(500).json({
        success: false,
        message: 'Jenkins 빌드 실행 중 오류가 발생했습니다.',
        error: jenkinsError.message
      });
    }

  } catch (error) {
    console.error('❌ 파이프라인 실행 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 실행 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * 파이프라인 통계 API
 * GET /api/operations/cicd/pipelines/statistics
 */
router.get('/statistics', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📊 파이프라인 통계 조회 시작...');

    const query = `
      SELECT 
        COUNT(*) as total_pipelines,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_pipelines,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_pipelines,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_pipelines,
        COUNT(CASE WHEN environment = 'production' THEN 1 END) as production_pipelines,
        COUNT(CASE WHEN environment = 'staging' THEN 1 END) as staging_pipelines,
        COUNT(CASE WHEN environment = 'development' THEN 1 END) as development_pipelines,
        COUNT(CASE WHEN pipeline_type = 'frontend' THEN 1 END) as frontend_pipelines,
        COUNT(CASE WHEN pipeline_type = 'backend' THEN 1 END) as backend_pipelines,
        COUNT(CASE WHEN pipeline_type = 'full-stack' THEN 1 END) as fullstack_pipelines,
        COUNT(CASE WHEN pipeline_type = 'microservice' THEN 1 END) as microservice_pipelines
      FROM operations_pipelines
    `;

    const result = await pool.query(query);
    const stats = result.rows[0];

    // 최근 배포 통계
    const deploymentStatsQuery = `
      SELECT 
        COUNT(*) as total_deployments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_deployments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_deployments,
        COUNT(CASE WHEN status = 'running' THEN 1 END) as running_deployments,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as deployments_last_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as deployments_last_7d
      FROM deployments
    `;

    const deploymentResult = await pool.query(deploymentStatsQuery);
    const deploymentStats = deploymentResult.rows[0];

    console.log('✅ 파이프라인 통계 조회 완료');

    res.json({
      success: true,
      data: {
        pipelines: {
          total: parseInt(stats.total_pipelines),
          active: parseInt(stats.active_pipelines),
          running: parseInt(stats.running_pipelines),
          failed: parseInt(stats.failed_pipelines),
          by_environment: {
            production: parseInt(stats.production_pipelines),
            staging: parseInt(stats.staging_pipelines),
            development: parseInt(stats.development_pipelines)
          },
          by_type: {
            frontend: parseInt(stats.frontend_pipelines),
            backend: parseInt(stats.backend_pipelines),
            fullstack: parseInt(stats.fullstack_pipelines),
            microservice: parseInt(stats.microservice_pipelines)
          }
        },
        deployments: {
          total: parseInt(deploymentStats.total_deployments),
          successful: parseInt(deploymentStats.successful_deployments),
          failed: parseInt(deploymentStats.failed_deployments),
          running: parseInt(deploymentStats.running_deployments),
          last_24h: parseInt(deploymentStats.deployments_last_24h),
          last_7d: parseInt(deploymentStats.deployments_last_7d)
        }
      },
      message: '파이프라인 통계를 성공적으로 조회했습니다.'
    });

  } catch (error) {
    console.error('❌ 파이프라인 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '파이프라인 통계 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
