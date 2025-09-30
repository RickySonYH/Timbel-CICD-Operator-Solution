// [advice from AI] 운영센터 대시보드 API - 시스템 상태, 통계, 활동 로그 등
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

// [advice from AI] PostgreSQL 연결
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel2024!',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 시스템 헬스 체크 API
router.get('/system-health', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  try {
    console.log('🏥 시스템 헬스 체크 요청');

    // [advice from AI] 각 시스템의 상태를 확인
    const healthStatus = {
      jenkins_status: 'healthy',
      nexus_status: 'healthy', 
      argocd_status: 'warning',
      k8s_status: 'healthy',
      database_status: 'healthy',
      last_updated: new Date().toISOString()
    };

    // [advice from AI] 실제 헬스 체크 로직 (향후 구현)
    try {
      // Jenkins 헬스 체크
      const jenkinsResponse = await fetch('http://jenkins.langsa.ai:8080/api/json', {
        timeout: 5000
      }).catch(() => null);
      
      if (!jenkinsResponse || !jenkinsResponse.ok) {
        healthStatus.jenkins_status = 'warning';
      }
    } catch (error) {
      console.log('⚠️ Jenkins 헬스 체크 실패:', error.message);
      healthStatus.jenkins_status = 'error';
    }

    // [advice from AI] 데이터베이스 연결 상태 확인
    try {
      await pool.query('SELECT 1');
      healthStatus.database_status = 'healthy';
    } catch (error) {
      console.error('❌ 데이터베이스 헬스 체크 실패:', error);
      healthStatus.database_status = 'error';
    }

    res.json({
      success: true,
      data: healthStatus
    });

  } catch (error) {
    console.error('❌ 시스템 헬스 체크 오류:', error);
    res.status(500).json({
      success: false,
      message: '시스템 헬스 체크 실패',
      error: error.message
    });
  }
});

// [advice from AI] 운영 통계 API
router.get('/statistics', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  try {
    console.log('📊 운영 통계 요청');

    const client = await pool.connect();
    
    try {
      // [advice from AI] 배포 통계
      const deploymentStatsQuery = `
        SELECT 
          COUNT(*) as total_deployments,
          COUNT(CASE WHEN sr.admin_decision = 'approve' THEN 1 END) as successful_deployments,
          COUNT(CASE WHEN sr.admin_decision = 'reject' THEN 1 END) as failed_deployments,
          COUNT(CASE WHEN sr.admin_decision IS NULL THEN 1 END) as pending_deployments
        FROM system_registrations sr
        WHERE sr.created_at >= NOW() - INTERVAL '30 days'
      `;

      // [advice from AI] 빌드 통계
      const buildStatsQuery = `
        SELECT 
          COUNT(*) as total_builds,
          COUNT(CASE WHEN bf.build_status = 'SUCCESS' THEN 1 END) as successful_builds,
          COUNT(CASE WHEN bf.build_status = 'FAILURE' THEN 1 END) as failed_builds
        FROM build_failures bf
        WHERE bf.created_at >= NOW() - INTERVAL '30 days'
      `;

      // [advice from AI] 이슈 통계
      const issueStatsQuery = `
        SELECT 
          COUNT(*) as total_issues,
          COUNT(CASE WHEN ir.status = 'resolved' THEN 1 END) as resolved_issues,
          COUNT(CASE WHEN ir.status = 'pending' THEN 1 END) as pending_issues
        FROM issue_reports ir
        WHERE ir.created_at >= NOW() - INTERVAL '30 days'
      `;

      const [deploymentStats, buildStats, issueStats] = await Promise.all([
        client.query(deploymentStatsQuery),
        client.query(buildStatsQuery).catch(() => ({ rows: [{ total_builds: 0, successful_builds: 0, failed_builds: 0 }] })),
        client.query(issueStatsQuery).catch(() => ({ rows: [{ total_issues: 0, resolved_issues: 0, pending_issues: 0 }] }))
      ]);

      const statistics = {
        deployments: deploymentStats.rows[0] || {},
        builds: buildStats.rows[0] || {},
        issues: issueStats.rows[0] || {},
        generated_at: new Date().toISOString()
      };

      res.json({
        success: true,
        data: statistics
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 운영 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '운영 통계 조회 실패',
      error: error.message
    });
  }
});

// [advice from AI] 최근 활동 로그 API
router.get('/recent-activities', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  try {
    console.log('📋 최근 활동 로그 요청');
    
    const limit = parseInt(req.query.limit) || 20;
    const client = await pool.connect();
    
    try {
      // [advice from AI] 최근 활동들을 통합 조회
      const activitiesQuery = `
        (
          SELECT 
            'deployment' as activity_type,
            CONCAT('프로젝트 "', p.name, '" 배포 ', 
              CASE sr.admin_decision 
                WHEN 'approve' THEN '승인' 
                WHEN 'reject' THEN '반려' 
                ELSE '요청'
              END
            ) as message,
            sr.updated_at as activity_time,
            sr.id::text as reference_id
          FROM system_registrations sr
          JOIN projects p ON sr.project_id = p.id
          WHERE sr.updated_at IS NOT NULL
        )
        UNION ALL
        (
          SELECT 
            'build' as activity_type,
            CONCAT('빌드 ', bf.build_status, ': ', COALESCE(bf.project_name, 'Unknown Project')) as message,
            bf.created_at as activity_time,
            bf.id::text as reference_id
          FROM build_failures bf
          WHERE bf.created_at >= NOW() - INTERVAL '7 days'
        )
        UNION ALL
        (
          SELECT 
            'issue' as activity_type,
            CONCAT('이슈 ', ir.status, ': ', ir.title) as message,
            ir.updated_at as activity_time,
            ir.id::text as reference_id
          FROM issue_reports ir
          WHERE ir.updated_at >= NOW() - INTERVAL '7 days'
        )
        ORDER BY activity_time DESC
        LIMIT $1
      `;

      const result = await client.query(activitiesQuery, [limit]);
      
      const activities = result.rows.map(row => ({
        id: row.reference_id,
        type: row.activity_type,
        message: row.message,
        time: row.activity_time,
        time_ago: getTimeAgo(row.activity_time)
      }));

      res.json({
        success: true,
        data: activities
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 최근 활동 로그 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '최근 활동 로그 조회 실패',
      error: error.message
    });
  }
});

// [advice from AI] 시간 차이 계산 헬퍼 함수
function getTimeAgo(dateTime) {
  const now = new Date();
  const past = new Date(dateTime);
  const diffInMinutes = Math.floor((now - past) / (1000 * 60));
  
  if (diffInMinutes < 1) return '방금 전';
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}일 전`;
}

// [advice from AI] 시스템 메트릭스 API
router.get('/metrics', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'operations']), async (req, res) => {
  try {
    console.log('📈 시스템 메트릭스 요청');

    // [advice from AI] Mock 메트릭스 데이터 (실제 모니터링 시스템 연동 시 교체)
    const metrics = {
      cpu_usage: Math.floor(Math.random() * 30) + 20, // 20-50%
      memory_usage: Math.floor(Math.random() * 40) + 30, // 30-70%
      disk_usage: Math.floor(Math.random() * 20) + 40, // 40-60%
      network_io: Math.floor(Math.random() * 100) + 50, // 50-150 MB/s
      active_builds: Math.floor(Math.random() * 5) + 1, // 1-5
      queue_length: Math.floor(Math.random() * 10), // 0-9
      response_time: Math.floor(Math.random() * 200) + 100, // 100-300ms
      error_rate: Math.random() * 2, // 0-2%
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('❌ 시스템 메트릭스 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '시스템 메트릭스 조회 실패',
      error: error.message
    });
  }
});

module.exports = router;
