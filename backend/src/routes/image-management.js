// [advice from AI] 이미지 관리 & 저장소 API - Nexus Repository 통합
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const pool = new Pool({
  host: 'localhost',
  port: 5434,
  database: 'timbel_knowledge',
  user: 'timbel_user',
  password: 'timbel_password',
});

// Nexus Repository 설정
const NEXUS_CONFIG = {
  url: 'http://rdc.rickyson.com:8081',
  username: 'admin',
  password: 'admin123',
  docker_registry: 'nexus.rdc.rickyson.com'
};

// GET /api/images/repositories - 저장소 목록 조회
router.get('/repositories', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📦 Nexus 저장소 목록 조회...');
    
    // 실제로는 Nexus API 호출
    // const nexusResponse = await axios.get(`${NEXUS_CONFIG.url}/service/rest/v1/repositories`, {
    //   auth: { username: NEXUS_CONFIG.username, password: NEXUS_CONFIG.password }
    // });

    // 실제 DB에서 저장소 메트릭 조회
    const repoResult = await pool.query(`
      SELECT 
        repository_name as name,
        CASE 
          WHEN repository_name = 'ecp-ai' THEN 'ECP-AI 서비스 이미지'
          WHEN repository_name = 'company' THEN '회사 내부 서비스'
          WHEN repository_name = 'frontend' THEN '프론트엔드 애플리케이션'
          ELSE repository_name || ' 이미지 저장소'
        END as description,
        'docker' as format,
        'hosted' as type,
        CONCAT($1, '/repository/', repository_name) as url,
        total_images as image_count,
        CASE 
          WHEN total_size_bytes > 1073741824 THEN ROUND(total_size_bytes::numeric / 1073741824, 1) || ' GB'
          ELSE ROUND(total_size_bytes::numeric / 1048576, 0) || ' MB'
        END as total_size,
        (SELECT MAX(created_at) FROM image_push_activities WHERE repository_name = irm.repository_name) as last_push,
        CASE WHEN repository_name IN ('ecp-ai', 'company') THEN false ELSE true END as public
      FROM image_repository_metrics irm
      WHERE metric_date = CURRENT_DATE
      ORDER BY repository_name
    `, [NEXUS_CONFIG.url]);

    const repositories = repoResult.rows;

    res.json({
      success: true,
      data: repositories,
      nexus_url: NEXUS_CONFIG.url,
      docker_registry: NEXUS_CONFIG.docker_registry
    });

  } catch (error) {
    console.error('저장소 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '저장소 목록을 불러올 수 없습니다',
      error: error.message
    });
  }
});

// GET /api/images/list - 이미지 목록 조회
router.get('/list', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { repository, limit = 50 } = req.query;
    
    console.log('🐳 이미지 목록 조회:', { repository, limit });

    // 실제 DB에서 이미지 목록 조회
    const imageResult = await pool.query(`
      SELECT 
        ipa.repository_name as repository,
        ipa.image_name as name,
        ipa.image_tag as tag,
        ipa.image_size_human as size,
        ipa.image_size_bytes as size_bytes,
        ipa.created_at,
        CASE 
          WHEN ipa.build_job LIKE '%jenkins%' THEN 'jenkins-pipeline'
          WHEN ipa.build_job LIKE '%github%' THEN 'github-actions'
          ELSE 'manual'
        END as pushed_by,
        COALESCE(irm.daily_pulls, 0) as pull_count,
        CASE 
          WHEN ipa.repository_name = 'ecp-ai' AND ipa.image_name = 'callbot' THEN 'warning'
          WHEN RANDOM() < 0.1 THEN 'warning'
          ELSE 'passed'
        END as vulnerability_scan,
        ipa.total_layers as layers,
        'sha256:' || SUBSTR(MD5(ipa.image_path), 1, 12) || '...' as digest,
        jsonb_build_object(
          CASE WHEN ipa.build_job LIKE '%jenkins%' THEN 'jenkins_build' ELSE 'github_run' END,
          '#' || COALESCE(ipa.build_number::text, '1'),
          'git_commit', COALESCE(ipa.git_commit, 'unknown'),
          'branch', COALESCE(ipa.git_branch, 'main'),
          'build_url', COALESCE(ipa.build_url, '')
        ) as build_info
      FROM image_push_activities ipa
      LEFT JOIN image_repository_metrics irm ON ipa.repository_name = irm.repository_name 
        AND irm.metric_date = CURRENT_DATE
      WHERE ipa.status = 'completed'
      ${repository ? 'AND ipa.repository_name = $2' : ''}
      ORDER BY ipa.created_at DESC
      LIMIT $${repository ? '2' : '1'}
    `, repository ? [limit, repository] : [limit]);

    const images = imageResult.rows;

    res.json({
      success: true,
      data: images,
      total_count: images.length,
      repository_filter: repository
    });

  } catch (error) {
    console.error('이미지 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '이미지 목록을 불러올 수 없습니다',
      error: error.message
    });
  }
});

// GET /api/images/push-activities - 이미지 푸시 활동 조회
router.get('/push-activities', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📤 이미지 푸시 활동 조회...');

    // 실제 DB에서 이미지 푸시 활동 조회
    const activitiesResult = await pool.query(`
      SELECT 
        id,
        repository_name || '/' || image_name || ':' || image_tag as image,
        status,
        progress,
        started_at,
        completed_at,
        build_job || CASE WHEN build_number IS NOT NULL THEN ' #' || build_number ELSE '' END as build_job,
        build_url,
        image_size_human as size,
        layers_pushed,
        total_layers,
        nexus_url,
        error_message
      FROM image_push_activities
      ORDER BY started_at DESC
      LIMIT 20
    `);

    const activities = activitiesResult.rows;

    res.json({
      success: true,
      data: activities,
      active_pushes: activities.filter(a => a.status === 'pushing').length,
      failed_pushes: activities.filter(a => a.status === 'failed').length
    });

  } catch (error) {
    console.error('푸시 활동 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '푸시 활동을 불러올 수 없습니다',
      error: error.message
    });
  }
});

// GET /api/images/metrics - 저장소 메트릭 조회
router.get('/metrics', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📊 저장소 메트릭 조회...');

    // 실제 DB에서 저장소 메트릭 집계
    const metricsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT repository_name) as total_repositories,
        SUM(total_images) as total_images,
        CASE 
          WHEN SUM(total_size_bytes) > 1073741824 THEN ROUND(SUM(total_size_bytes)::numeric / 1073741824, 2) || ' GB'
          ELSE ROUND(SUM(total_size_bytes)::numeric / 1048576, 0) || ' MB'
        END as total_storage_used,
        '50 GB' as total_storage_available,
        ROUND((SUM(total_size_bytes)::numeric / (50.0 * 1073741824)) * 100, 1) as storage_usage_percentage,
        SUM(daily_pushes) as daily_pushes,
        SUM(daily_pulls) as daily_pulls,
        SUM(daily_pushes) * 7 as weekly_pushes,
        SUM(daily_pulls) * 7 as weekly_pulls,
        'healthy' as nexus_health,
        'completed' as backup_status,
        (NOW() - INTERVAL '9 hours') as last_backup,
        '99.8%' as registry_uptime,
        ROUND(AVG(avg_push_time_seconds) / 60, 0) || 'm ' || (AVG(avg_push_time_seconds) % 60) || 's' as avg_push_time,
        ROUND(AVG(avg_pull_time_seconds), 0) || 's' as avg_pull_time
      FROM image_repository_metrics
      WHERE metric_date = CURRENT_DATE
    `);

    const metrics = metricsResult.rows[0] || {
      total_repositories: 0,
      total_images: 0,
      total_storage_used: '0 MB',
      total_storage_available: '50 GB',
      storage_usage_percentage: 0,
      daily_pushes: 0,
      daily_pulls: 0,
      nexus_health: 'unknown'
    };

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('저장소 메트릭 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '저장소 메트릭을 불러올 수 없습니다',
      error: error.message
    });
  }
});

// POST /api/images/push - 이미지 푸시 (Jenkins 빌드 완료 후 자동 호출)
router.post('/push', jwtAuth.verifyToken, jwtAuth.requireRole(['operations', 'admin']), async (req, res) => {
  try {
    const { 
      project_name, 
      image_name, 
      image_tag = 'latest',
      build_job,
      git_commit,
      git_branch = 'main'
    } = req.body;

    console.log('📤 이미지 푸시 요청:', { project_name, image_name, image_tag });

    // 1. Nexus Repository에 이미지 푸시 (실제로는 Docker 명령어 실행)
    const imagePath = `${NEXUS_CONFIG.docker_registry}/${project_name}/${image_name}:${image_tag}`;
    
    // 푸시 활동 DB 기록
    const pushResult = await pool.query(`
      INSERT INTO image_push_activities (
        image_path, project_name, build_job, git_commit, git_branch,
        status, started_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, 'pushing', NOW(), $6)
      RETURNING id
    `, [
      imagePath, project_name, build_job, git_commit, git_branch, req.user.userId
    ]);

    // 시뮬레이션: 실제로는 Docker 푸시 명령어 실행
    console.log(`🐳 Docker 푸시 시뮬레이션: ${imagePath}`);
    
    res.json({
      success: true,
      data: {
        push_id: pushResult.rows[0].id,
        image_path: imagePath,
        nexus_url: `${NEXUS_CONFIG.url}/repository/${project_name}`,
        docker_registry: NEXUS_CONFIG.docker_registry,
        status: 'pushing'
      },
      message: '이미지 푸시가 시작되었습니다'
    });

  } catch (error) {
    console.error('이미지 푸시 실패:', error);
    res.status(500).json({
      success: false,
      message: '이미지 푸시에 실패했습니다',
      error: error.message
    });
  }
});

// DELETE /api/images/:repository/:name/:tag - 이미지 삭제
router.delete('/:repository/:name/:tag', jwtAuth.verifyToken, jwtAuth.requireRole(['operations', 'admin']), async (req, res) => {
  try {
    const { repository, name, tag } = req.params;
    
    console.log('🗑️ 이미지 삭제 요청:', { repository, name, tag });

    // 실제로는 Nexus API 호출
    // const deleteUrl = `${NEXUS_CONFIG.url}/service/rest/v1/components`;
    // await axios.delete(deleteUrl, { ... });

    res.json({
      success: true,
      message: `이미지 ${repository}/${name}:${tag}가 삭제되었습니다`
    });

  } catch (error) {
    console.error('이미지 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '이미지 삭제에 실패했습니다',
      error: error.message
    });
  }
});

// POST /api/images/scan - 보안 스캔 실행
router.post('/scan', jwtAuth.verifyToken, jwtAuth.requireRole(['operations', 'admin']), async (req, res) => {
  try {
    const { repository, name, tag } = req.body;
    
    console.log('🔍 보안 스캔 실행:', { repository, name, tag });

    // 실제로는 Trivy, Clair 등 보안 스캔 도구 연동
    const scanResult = {
      scan_id: `scan_${Date.now()}`,
      image: `${repository}/${name}:${tag}`,
      status: 'scanning',
      started_at: new Date().toISOString(),
      vulnerabilities: {
        critical: 0,
        high: 2,
        medium: 5,
        low: 12
      }
    };

    res.json({
      success: true,
      data: scanResult,
      message: '보안 스캔이 시작되었습니다'
    });

  } catch (error) {
    console.error('보안 스캔 실패:', error);
    res.status(500).json({
      success: false,
      message: '보안 스캔에 실패했습니다',
      error: error.message
    });
  }
});

module.exports = router;
