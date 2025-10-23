// [advice from AI] 시스템 로그 관리 API
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

// PostgreSQL 연결 - timbel_cicd_operator DB (system_logs 테이블이 있는 곳)
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: 'timbel_cicd_operator',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] 로그 목록 조회 API
router.get('/logs', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      level, 
      service, 
      search, 
      start_date, 
      end_date 
    } = req.query;

    console.log('📋 시스템 로그 조회 요청:', {
      page, limit, level, service, search, start_date, end_date,
      user: req.user?.username
    });

    let whereConditions = [];
    let queryParams = [];
    let paramIndex = 1;

    // 레벨 필터
    if (level && level !== 'all') {
      whereConditions.push(`level = $${paramIndex}`);
      queryParams.push(level);
      paramIndex++;
    }

    // 서비스 필터
    if (service && service !== 'all') {
      whereConditions.push(`service = $${paramIndex}`);
      queryParams.push(service);
      paramIndex++;
    }

    // 검색어 필터
    if (search) {
      whereConditions.push(`(
        message ILIKE $${paramIndex} OR 
        service ILIKE $${paramIndex} OR 
        component ILIKE $${paramIndex} OR 
        username ILIKE $${paramIndex} OR
        endpoint ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    // 날짜 범위 필터
    if (start_date) {
      whereConditions.push(`timestamp >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`timestamp <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // 전체 카운트 조회
    const countQuery = `
      SELECT COUNT(*) as total_count 
      FROM system_logs 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].total_count);

    // 페이징 계산
    const offset = (page - 1) * limit;
    queryParams.push(limit, offset);

    // 로그 데이터 조회
    const logsQuery = `
      SELECT 
        id, timestamp, level, service, component, message,
        username, ip_address, endpoint, method, response_time, 
        status_code, user_agent, request_id, metadata,
        created_at
      FROM system_logs 
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const logsResult = await pool.query(logsQuery, queryParams);

    console.log(`✅ 로그 조회 완료: ${logsResult.rows.length}개 (총 ${totalCount}개)`);

    res.json({
      success: true,
      data: {
        logs: logsResult.rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total_count: totalCount,
          total_pages: Math.ceil(totalCount / limit)
        }
      },
      message: '로그 목록을 성공적으로 조회했습니다.'
    });

  } catch (error) {
    console.error('❌ 로그 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '로그 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 로그 통계 조회 API
router.get('/logs/statistics', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📊 로그 통계 조회 시작...');

    // 전체 통계
    const totalStatsQuery = `
      SELECT 
        COUNT(*) as total_logs,
        COUNT(CASE WHEN level = 'error' THEN 1 END) as error_count,
        COUNT(CASE WHEN level = 'warn' THEN 1 END) as warn_count,
        COUNT(CASE WHEN level = 'info' THEN 1 END) as info_count,
        COUNT(CASE WHEN level = 'debug' THEN 1 END) as debug_count,
        COUNT(DISTINCT service) as active_services,
        COUNT(DISTINCT username) as active_users
      FROM system_logs 
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
    `;

    // 서비스별 통계
    const serviceStatsQuery = `
      SELECT 
        service,
        COUNT(*) as log_count,
        COUNT(CASE WHEN level = 'error' THEN 1 END) as error_count,
        COUNT(CASE WHEN level = 'warn' THEN 1 END) as warn_count
      FROM system_logs 
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY service
      ORDER BY log_count DESC
      LIMIT 10
    `;

    // 시간별 통계 (최근 24시간)
    const hourlyStatsQuery = `
      SELECT 
        DATE_TRUNC('hour', timestamp) as hour,
        COUNT(*) as log_count,
        COUNT(CASE WHEN level = 'error' THEN 1 END) as error_count,
        COUNT(CASE WHEN level = 'warn' THEN 1 END) as warn_count
      FROM system_logs 
      WHERE timestamp >= NOW() - INTERVAL '24 hours'
      GROUP BY DATE_TRUNC('hour', timestamp)
      ORDER BY hour DESC
      LIMIT 24
    `;

    const [totalStats, serviceStats, hourlyStats] = await Promise.all([
      pool.query(totalStatsQuery),
      pool.query(serviceStatsQuery),
      pool.query(hourlyStatsQuery)
    ]);

    console.log('✅ 로그 통계 조회 완료');

    res.json({
      success: true,
      data: {
        total_statistics: totalStats.rows[0],
        service_statistics: serviceStats.rows,
        hourly_statistics: hourlyStats.rows
      },
      message: '로그 통계를 성공적으로 조회했습니다.'
    });

  } catch (error) {
    console.error('❌ 로그 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '로그 통계 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 로그 상세 조회 API
router.get('/logs/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 로그 상세 조회: ${id}`);

    const query = `
      SELECT * FROM system_logs 
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '해당 로그를 찾을 수 없습니다.'
      });
    }

    console.log('✅ 로그 상세 조회 완료');

    res.json({
      success: true,
      data: result.rows[0],
      message: '로그 상세 정보를 성공적으로 조회했습니다.'
    });

  } catch (error) {
    console.error('❌ 로그 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '로그 상세 조회 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 로그 생성 API (시스템에서 사용)
router.post('/logs', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      level,
      service,
      component,
      message,
      username,
      ip_address,
      endpoint,
      method,
      response_time,
      status_code,
      user_agent,
      request_id,
      session_id,
      metadata,
      stack_trace
    } = req.body;

    console.log('📝 새 로그 생성:', { level, service, message });

    const query = `
      INSERT INTO system_logs (
        level, service, component, message, username, ip_address,
        endpoint, method, response_time, status_code, user_agent,
        request_id, session_id, metadata, stack_trace
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      ) RETURNING id, timestamp
    `;

    const result = await pool.query(query, [
      level, service, component, message, username, ip_address,
      endpoint, method, response_time, status_code, user_agent,
      request_id, session_id, JSON.stringify(metadata), stack_trace
    ]);

    console.log('✅ 로그 생성 완료:', result.rows[0].id);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '로그가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('❌ 로그 생성 실패:', error);
    res.status(500).json({
      success: false,
      message: '로그 생성 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

// [advice from AI] 로그 삭제 API (관리자 전용)
router.delete('/logs/cleanup', jwtAuth.verifyToken, jwtAuth.requireRole(['admin']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    console.log(`🗑️ ${days}일 이전 로그 삭제 시작...`);

    const query = `
      DELETE FROM system_logs 
      WHERE timestamp < NOW() - INTERVAL '${days} days'
      RETURNING COUNT(*)
    `;

    const result = await pool.query(query);
    const deletedCount = result.rowCount;

    console.log(`✅ 오래된 로그 삭제 완료: ${deletedCount}개`);

    res.json({
      success: true,
      data: { deleted_count: deletedCount },
      message: `${days}일 이전 로그 ${deletedCount}개가 삭제되었습니다.`
    });

  } catch (error) {
    console.error('❌ 로그 삭제 실패:', error);
    res.status(500).json({
      success: false,
      message: '로그 삭제 중 오류가 발생했습니다.',
      error: error.message
    });
  }
});

module.exports = router;
