// [advice from AI] 카탈로그 관련 라우터 (기본 구조)

import express from 'express';
import { Database } from '../utils/database';
const jwtAuth = require('../middleware/jwtAuth');
import { logger } from '../utils/logger';

const router = express.Router();

// [advice from AI] 도메인 목록 조회
router.get('/domains', jwtAuth.verifyToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const result = await Database.query(`
      SELECT 
        d.*,
        COUNT(s.id) as system_count
      FROM catalog_domains d
      LEFT JOIN catalog_systems s ON s.domain_id = d.id
      GROUP BY d.id
      ORDER BY d.name ASC
    `);

    res.json({
      success: true,
      data: { domains: result.rows }
    });
    return;
  } catch (error: any) {
    logger.error('Get domains error:', error);
    res.status(500).json({
      error: '도메인 목록 조회에 실패했습니다'
    });
    return;
  }
});

// [advice from AI] 시스템 목록 조회
router.get('/systems', jwtAuth.verifyToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const result = await Database.query(`
      SELECT 
        s.*,
        d.name as domain_name,
        COUNT(c.id) as component_count
      FROM catalog_systems s
      LEFT JOIN catalog_domains d ON s.domain_id = d.id
      LEFT JOIN catalog_components c ON c.system_id = s.id
      GROUP BY s.id, d.name
      ORDER BY s.name ASC
    `);

    res.json({
      success: true,
      data: { systems: result.rows }
    });
    return;
  } catch (error: any) {
    logger.error('Get systems error:', error);
    res.status(500).json({
      error: '시스템 목록 조회에 실패했습니다'
    });
    return;
  }
});

// [advice from AI] 컴포넌트 목록 조회
router.get('/components', jwtAuth.verifyToken, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const result = await Database.query(`
      SELECT 
        c.*,
        s.name as system_name,
        d.name as domain_name
      FROM catalog_components c
      LEFT JOIN catalog_systems s ON c.system_id = s.id
      LEFT JOIN catalog_domains d ON s.domain_id = d.id
      ORDER BY c.name ASC
    `);

    res.json({
      success: true,
      data: { components: result.rows }
    });
    return;
  } catch (error: any) {
    logger.error('Get components error:', error);
    res.status(500).json({
      error: '컴포넌트 목록 조회에 실패했습니다'
    });
    return;
  }
});

export default router;