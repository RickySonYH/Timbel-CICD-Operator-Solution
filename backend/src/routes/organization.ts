// [advice from AI] 조직 관리 라우터 (Administrator 전용)

import express from 'express';
import { body, validationResult } from 'express-validator';
import { Database } from '../utils/database';
import { authenticate, requireAdministrator } from '../middleware/auth';
import { PermissionLevel } from '../types/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// [advice from AI] 모든 조직 조회 (Administrator만)
router.get('/', authenticate, requireAdministrator, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const result = await Database.query(`
      SELECT 
        o.*,
        p.name as parent_name,
        COUNT(u.id) as user_count
      FROM timbel_organization o
      LEFT JOIN timbel_organization p ON o.parent_id = p.id
      LEFT JOIN timbel_users u ON u.organization_id = o.id
      GROUP BY o.id, p.name
      ORDER BY o.permission_level ASC, o.name ASC
    `);

    res.json({
      success: true,
      data: { organizations: result.rows }
    });
    return;
  } catch (error: any) {
    logger.error('Get organizations error:', error);
    res.status(500).json({
      error: '조직 목록 조회에 실패했습니다'
    });
    return;
  }
});

// [advice from AI] 새 조직 생성 (Administrator만)
router.post('/', authenticate, requireAdministrator, [
  body('name').notEmpty().withMessage('조직명을 입력하세요'),
  body('structureType').isIn(['leadership', 'team', 'role']).withMessage('올바른 조직 구조 타입을 선택하세요'),
  body('permissionLevel').isInt({ min: 0, max: 2 }).withMessage('권한 레벨은 0-2 사이여야 합니다'),
  body('teamCapacity').optional().isInt({ min: 1 }).withMessage('팀 정원은 1명 이상이어야 합니다')
], async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, structureType, description, parentId, permissionLevel, teamCapacity } = req.body;

    // 부모 조직이 있는 경우 존재 여부 확인
    if (parentId) {
      const parentResult = await Database.query(
        'SELECT * FROM timbel_organization WHERE id = $1',
        [parentId]
      );
      
      if (parentResult.rows.length === 0) {
        res.status(400).json({
          error: '부모 조직을 찾을 수 없습니다'
        });
        return;
      }

      const parentOrg = parentResult.rows[0];
      // 권한 레벨 검증 (하위 조직은 상위 조직보다 높은 권한을 가질 수 없음)
      if (permissionLevel < parentOrg.permission_level) {
        res.status(400).json({
          error: '하위 조직은 상위 조직보다 높은 권한을 가질 수 없습니다'
        });
        return;
      }
    }

    const result = await Database.query(`
      INSERT INTO timbel_organization (name, structure_type, description, parent_id, permission_level, team_capacity)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, structureType, description, parentId, permissionLevel, teamCapacity]);

    const organization = result.rows[0];

    logger.info(`Organization created: ${organization.name} by ${(req as any).user?.email || 'unknown'}`);

    res.status(201).json({
      success: true,
      message: '조직이 생성되었습니다',
      data: { organization }
    });
    return;
  } catch (error: any) {
    logger.error('Create organization error:', error);
    res.status(500).json({
      error: '조직 생성에 실패했습니다'
    });
    return;
  }
});

// [advice from AI] 조직 정보 수정 (Administrator만)
router.put('/:id', authenticate, requireAdministrator, [
  body('name').optional().notEmpty().withMessage('조직명을 입력하세요'),
  body('teamCapacity').optional().isInt({ min: 1 }).withMessage('팀 정원은 1명 이상이어야 합니다')
], async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const updateData = req.body;

    // 조직 존재 여부 확인
    const existingResult = await Database.query(
      'SELECT * FROM timbel_organization WHERE id = $1',
      [id]
    );

    if (existingResult.rows.length === 0) {
      res.status(404).json({
        error: '조직을 찾을 수 없습니다'
      });
      return;
    }

    const existingOrg = existingResult.rows[0];

    // System Administration 조직은 수정 불가
    if (existingOrg.name === 'System Administration') {
      res.status(403).json({
        error: '시스템 관리 조직은 수정할 수 없습니다'
      });
      return;
    }

    // 업데이트할 필드들만 동적으로 구성
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(updateData[key]);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      res.status(400).json({
        error: '수정할 데이터가 없습니다'
      });
      return;
    }

    updateValues.push(id);
    const result = await Database.query(`
      UPDATE timbel_organization 
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `, updateValues);

    const organization = result.rows[0];

    logger.info(`Organization updated: ${organization.name} by ${(req as any).user?.email || 'unknown'}`);

    res.json({
      success: true,
      message: '조직 정보가 수정되었습니다',
      data: { organization }
    });
    return;
  } catch (error: any) {
    logger.error('Update organization error:', error);
    res.status(500).json({
      error: '조직 정보 수정에 실패했습니다'
    });
    return;
  }
});

// [advice from AI] 조직 삭제 (Administrator만)
router.delete('/:id', authenticate, requireAdministrator, async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    const { id } = req.params;

    const organizationResult = await Database.query(`
      SELECT o.*, 
             COUNT(u.id) as user_count,
             COUNT(c.id) as children_count
      FROM timbel_organization o
      LEFT JOIN timbel_users u ON u.organization_id = o.id
      LEFT JOIN timbel_organization c ON c.parent_id = o.id
      WHERE o.id = $1
      GROUP BY o.id
    `, [id]);

    if (organizationResult.rows.length === 0) {
      res.status(404).json({
        error: '조직을 찾을 수 없습니다'
      });
      return;
    }

    const organization = organizationResult.rows[0];

    // System Administration 조직은 삭제 불가
    if (organization.name === 'System Administration') {
      res.status(403).json({
        error: '시스템 관리 조직은 삭제할 수 없습니다'
      });
      return;
    }

    // 하위 조직이 있는 경우 삭제 불가
    if (parseInt(organization.children_count) > 0) {
      res.status(400).json({
        error: '하위 조직이 있는 조직은 삭제할 수 없습니다'
      });
      return;
    }

    // 소속 사용자가 있는 경우 삭제 불가
    if (parseInt(organization.user_count) > 0) {
      res.status(400).json({
        error: '소속 사용자가 있는 조직은 삭제할 수 없습니다'
      });
      return;
    }

    await Database.query('DELETE FROM timbel_organization WHERE id = $1', [id]);

    logger.info(`Organization deleted: ${organization.name} by ${(req as any).user?.email || 'unknown'}`);

    res.json({
      success: true,
      message: '조직이 삭제되었습니다'
    });
    return;
  } catch (error: any) {
    logger.error('Delete organization error:', error);
    res.status(500).json({
      error: '조직 삭제에 실패했습니다'
    });
    return;
  }
});

export default router;