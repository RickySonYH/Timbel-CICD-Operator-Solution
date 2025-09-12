const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'timbel_user',
  host: process.env.POSTGRES_HOST || 'postgres',
  database: process.env.POSTGRES_DB || 'timbel_knowledge',
  password: process.env.POSTGRES_PASSWORD || 'timbel_password',
  port: process.env.POSTGRES_PORT || 5432,
});

// [advice from AI] 카탈로그 엔티티 목록 조회 (검색 및 필터링 지원)
router.get('/entities', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      kind,
      namespace = 'default',
      owner,
      lifecycle,
      tags,
      search,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = `
      SELECT 
        ce.*,
        u1.full_name as created_by_name,
        u2.full_name as updated_by_name
      FROM catalog_entities ce
      LEFT JOIN timbel_users u1 ON ce.created_by = u1.id
      LEFT JOIN timbel_users u2 ON ce.updated_by = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    // 필터링 조건 추가
    if (kind) {
      query += ` AND ce.kind = $${++paramCount}`;
      params.push(kind);
    }

    if (namespace) {
      query += ` AND ce.namespace = $${++paramCount}`;
      params.push(namespace);
    }

    if (owner) {
      query += ` AND ce.owner = $${++paramCount}`;
      params.push(owner);
    }

    if (lifecycle) {
      query += ` AND ce.lifecycle = $${++paramCount}`;
      params.push(lifecycle);
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      query += ` AND ce.tags ?| $${++paramCount}`;
      params.push(tagArray);
    }

    if (search) {
      query += ` AND EXISTS (
        SELECT 1 FROM catalog_search_index csi 
        WHERE csi.entity_id = ce.id 
        AND to_tsvector('english', csi.search_text) @@ plainto_tsquery('english', $${++paramCount})
      )`;
      params.push(search);
    }

    // 정렬
    const validSortColumns = ['name', 'title', 'created_at', 'updated_at', 'owner', 'lifecycle'];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ce.${sortColumn} ${sortDirection}`;

    // 페이지네이션
    const offset = (page - 1) * limit;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    // 전체 개수 조회
    let countQuery = `
      SELECT COUNT(*) as total
      FROM catalog_entities ce
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;

    if (kind) {
      countQuery += ` AND ce.kind = $${++countParamCount}`;
      countParams.push(kind);
    }

    if (namespace) {
      countQuery += ` AND ce.namespace = $${++countParamCount}`;
      countParams.push(namespace);
    }

    if (owner) {
      countQuery += ` AND ce.owner = $${++countParamCount}`;
      countParams.push(owner);
    }

    if (lifecycle) {
      countQuery += ` AND ce.lifecycle = $${++countParamCount}`;
      countParams.push(lifecycle);
    }

    if (tags) {
      const tagArray = Array.isArray(tags) ? tags : [tags];
      countQuery += ` AND ce.tags ?| $${++countParamCount}`;
      countParams.push(tagArray);
    }

    if (search) {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM catalog_search_index csi 
        WHERE csi.entity_id = ce.id 
        AND to_tsvector('english', csi.search_text) @@ plainto_tsquery('english', $${++countParamCount})
      )`;
      countParams.push(search);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('카탈로그 엔티티 목록 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '카탈로그 엔티티 목록 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 카탈로그 엔티티 상세 조회
router.get('/entities/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const entityQuery = `
      SELECT 
        ce.*,
        u1.full_name as created_by_name,
        u2.full_name as updated_by_name
      FROM catalog_entities ce
      LEFT JOIN timbel_users u1 ON ce.created_by = u1.id
      LEFT JOIN timbel_users u2 ON ce.updated_by = u2.id
      WHERE ce.id = $1
    `;

    const entityResult = await pool.query(entityQuery, [id]);

    if (entityResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '엔티티를 찾을 수 없습니다.',
        message: '해당 ID의 엔티티가 존재하지 않습니다.'
      });
    }

    const entity = entityResult.rows[0];

    // 관계 정보 조회
    const relationsQuery = `
      SELECT 
        r.*,
        source_entity.name as source_name,
        source_entity.kind as source_kind,
        target_entity.name as target_name,
        target_entity.kind as target_kind
      FROM catalog_relations r
      LEFT JOIN catalog_entities source_entity ON r.source_entity_id = source_entity.id
      LEFT JOIN catalog_entities target_entity ON r.target_entity_id = target_entity.id
      WHERE r.source_entity_id = $1 OR r.target_entity_id = $1
    `;

    const relationsResult = await pool.query(relationsQuery, [id]);

    // API 정보 조회 (API 타입인 경우)
    let apiInfo = null;
    if (entity.kind === 'api') {
      const apiQuery = `
        SELECT * FROM catalog_apis 
        WHERE entity_id = $1
      `;
      const apiResult = await pool.query(apiQuery, [id]);
      apiInfo = apiResult.rows[0] || null;
    }

    // CI/CD 파이프라인 정보 조회
    const cicdQuery = `
      SELECT 
        p.*,
        (SELECT COUNT(*) FROM catalog_cicd_runs r WHERE r.pipeline_id = p.id) as run_count,
        (SELECT status FROM catalog_cicd_runs r WHERE r.pipeline_id = p.id ORDER BY r.started_at DESC LIMIT 1) as last_run_status
      FROM catalog_cicd_pipelines p
      WHERE p.entity_id = $1
    `;
    const cicdResult = await pool.query(cicdQuery, [id]);

    // 문서 정보 조회
    const docsQuery = `
      SELECT * FROM catalog_docs 
      WHERE entity_id = $1 AND is_published = true
      ORDER BY created_at DESC
    `;
    const docsResult = await pool.query(docsQuery, [id]);

    // Kubernetes 리소스 정보 조회
    const k8sQuery = `
      SELECT * FROM catalog_kubernetes_resources 
      WHERE entity_id = $1
    `;
    const k8sResult = await pool.query(k8sQuery, [id]);

    res.json({
      success: true,
      data: {
        entity,
        relations: relationsResult.rows,
        api: apiInfo,
        cicd: cicdResult.rows,
        docs: docsResult.rows,
        kubernetes: k8sResult.rows
      }
    });

  } catch (error) {
    console.error('카탈로그 엔티티 상세 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '카탈로그 엔티티 상세 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 카탈로그 엔티티 생성
router.post('/entities', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      kind,
      name,
      namespace = 'default',
      title,
      description,
      owner,
      lifecycle = 'production',
      tags = [],
      annotations = {},
      metadata = {},
      spec = {}
    } = req.body;

    // 필수 필드 검증
    if (!kind || !name || !owner) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다.',
        message: 'kind, name, owner는 필수 필드입니다.'
      });
    }

    // 중복 검사
    const duplicateQuery = `
      SELECT id FROM catalog_entities 
      WHERE kind = $1 AND name = $2 AND namespace = $3
    `;
    const duplicateResult = await pool.query(duplicateQuery, [kind, name, namespace]);

    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: '중복된 엔티티입니다.',
        message: '해당 kind, name, namespace 조합의 엔티티가 이미 존재합니다.'
      });
    }

    const insertQuery = `
      INSERT INTO catalog_entities (
        kind, name, namespace, title, description, owner, lifecycle, 
        tags, annotations, metadata, spec, created_by, updated_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12
      ) RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      kind, name, namespace, title, description, owner, lifecycle,
      JSON.stringify(tags), JSON.stringify(annotations), JSON.stringify(metadata), JSON.stringify(spec),
      req.user.id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '카탈로그 엔티티가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('카탈로그 엔티티 생성 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '카탈로그 엔티티 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 카탈로그 엔티티 수정
router.put('/entities/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      owner,
      lifecycle,
      tags,
      annotations,
      metadata,
      spec
    } = req.body;

    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;

    if (title !== undefined) {
      updateFields.push(`title = $${++paramCount}`);
      updateValues.push(title);
    }

    if (description !== undefined) {
      updateFields.push(`description = $${++paramCount}`);
      updateValues.push(description);
    }

    if (owner !== undefined) {
      updateFields.push(`owner = $${++paramCount}`);
      updateValues.push(owner);
    }

    if (lifecycle !== undefined) {
      updateFields.push(`lifecycle = $${++paramCount}`);
      updateValues.push(lifecycle);
    }

    if (tags !== undefined) {
      updateFields.push(`tags = $${++paramCount}`);
      updateValues.push(JSON.stringify(tags));
    }

    if (annotations !== undefined) {
      updateFields.push(`annotations = $${++paramCount}`);
      updateValues.push(JSON.stringify(annotations));
    }

    if (metadata !== undefined) {
      updateFields.push(`metadata = $${++paramCount}`);
      updateValues.push(JSON.stringify(metadata));
    }

    if (spec !== undefined) {
      updateFields.push(`spec = $${++paramCount}`);
      updateValues.push(JSON.stringify(spec));
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '수정할 필드가 없습니다.',
        message: '최소 하나의 필드를 수정해야 합니다.'
      });
    }

    updateFields.push(`updated_by = $${++paramCount}`);
    updateValues.push(req.user.id);

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    updateValues.push(id);

    const updateQuery = `
      UPDATE catalog_entities 
      SET ${updateFields.join(', ')}
      WHERE id = $${++paramCount}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '엔티티를 찾을 수 없습니다.',
        message: '해당 ID의 엔티티가 존재하지 않습니다.'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: '카탈로그 엔티티가 성공적으로 수정되었습니다.'
    });

  } catch (error) {
    console.error('카탈로그 엔티티 수정 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '카탈로그 엔티티 수정 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 카탈로그 엔티티 삭제
router.delete('/entities/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const deleteQuery = `
      DELETE FROM catalog_entities 
      WHERE id = $1
      RETURNING *
    `;

    const result = await pool.query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '엔티티를 찾을 수 없습니다.',
        message: '해당 ID의 엔티티가 존재하지 않습니다.'
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: '카탈로그 엔티티가 성공적으로 삭제되었습니다.'
    });

  } catch (error) {
    console.error('카탈로그 엔티티 삭제 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '카탈로그 엔티티 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 카탈로그 관계 생성
router.post('/relations', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      source_entity_id,
      target_entity_id,
      relation_type,
      reverse_relation_type,
      properties = {}
    } = req.body;

    // 필수 필드 검증
    if (!source_entity_id || !target_entity_id || !relation_type) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다.',
        message: 'source_entity_id, target_entity_id, relation_type는 필수 필드입니다.'
      });
    }

    // 중복 검사
    const duplicateQuery = `
      SELECT id FROM catalog_relations 
      WHERE source_entity_id = $1 AND target_entity_id = $2 AND relation_type = $3
    `;
    const duplicateResult = await pool.query(duplicateQuery, [source_entity_id, target_entity_id, relation_type]);

    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: '중복된 관계입니다.',
        message: '해당 관계가 이미 존재합니다.'
      });
    }

    const insertQuery = `
      INSERT INTO catalog_relations (
        source_entity_id, target_entity_id, relation_type, 
        reverse_relation_type, properties, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      source_entity_id, target_entity_id, relation_type,
      reverse_relation_type, JSON.stringify(properties), req.user.id
    ]);

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: '카탈로그 관계가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('카탈로그 관계 생성 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '카탈로그 관계 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] 카탈로그 통계 조회
router.get('/stats', jwtAuth.verifyToken, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        kind,
        COUNT(*) as count,
        COUNT(CASE WHEN lifecycle = 'production' THEN 1 END) as production_count,
        COUNT(CASE WHEN lifecycle = 'experimental' THEN 1 END) as experimental_count,
        COUNT(CASE WHEN lifecycle = 'deprecated' THEN 1 END) as deprecated_count
      FROM catalog_entities 
      GROUP BY kind
      ORDER BY count DESC
    `;

    const result = await pool.query(statsQuery);

    // 전체 통계
    const totalQuery = `
      SELECT 
        COUNT(*) as total_entities,
        COUNT(DISTINCT owner) as total_owners,
        COUNT(DISTINCT namespace) as total_namespaces
      FROM catalog_entities
    `;

    const totalResult = await pool.query(totalQuery);

    res.json({
      success: true,
      data: {
        by_kind: result.rows,
        total: totalResult.rows[0]
      }
    });

  } catch (error) {
    console.error('카탈로그 통계 조회 중 오류:', error);
    res.status(500).json({
      success: false,
      error: '카탈로그 통계 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
