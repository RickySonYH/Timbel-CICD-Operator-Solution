// [advice from AI] 알림 규칙 관리 API
// 임계값 기반 알림 규칙 CRUD 및 관리

const express = require('express');
const router = express.Router();
const { databaseManager } = require('../config/database');
const jwtAuth = require('../middleware/jwtAuth');
const alertRuleEngine = require('../services/alertRuleEngine');

// Helper function to get knowledge pool
const getKnowledgePool = () => {
  const pool = databaseManager.getPool('knowledge');
  if (!pool) {
    throw new Error('데이터베이스 연결 풀을 가져올 수 없습니다');
  }
  return pool;
};

/**
 * GET /api/alert-rules
 * 알림 규칙 목록 조회
 */
router.get('/', jwtAuth.verifyToken, async (req, res) => {
  try {
    const knowledgePool = getKnowledgePool();
    const { 
      limit = 20, 
      offset = 0, 
      search = '', 
      metric_type = '', 
      severity = '',
      enabled = ''
    } = req.query;

    let query = `
      SELECT ar.*,
             (SELECT COUNT(*) FROM alert_history WHERE rule_id = ar.id) as total_triggers
      FROM alert_rules ar
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (ar.rule_name ILIKE $${paramIndex} OR ar.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (metric_type) {
      query += ` AND ar.metric_type = $${paramIndex}`;
      params.push(metric_type);
      paramIndex++;
    }

    if (severity) {
      query += ` AND ar.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (enabled !== '') {
      query += ` AND ar.enabled = $${paramIndex}`;
      params.push(enabled === 'true');
      paramIndex++;
    }

    // 총 개수 조회
    const countResult = await knowledgePool.query(
      `SELECT COUNT(*) FROM (${query}) as count_query`,
      params
    );

    // 목록 조회
    query += ` ORDER BY ar.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await knowledgePool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('❌ 알림 규칙 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '알림 규칙 목록을 불러오는데 실패했습니다'
    });
  }
});

/**
 * GET /api/alert-rules/templates/list
 * 알림 규칙 템플릿 목록 조회
 */
router.get('/templates/list', jwtAuth.verifyToken, async (req, res) => {
  try {
    const knowledgePool = getKnowledgePool();
    const { category = '' } = req.query;

    let query = `SELECT * FROM alert_rule_templates WHERE 1=1`;
    const params = [];

    if (category) {
      query += ` AND category = $1`;
      params.push(category);
    }

    query += ` ORDER BY usage_count DESC, template_name ASC`;

    const result = await knowledgePool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('❌ 알림 규칙 템플릿 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '알림 규칙 템플릿을 불러오는데 실패했습니다'
    });
  }
});

module.exports = router;
