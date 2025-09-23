// [advice from AI] 프로젝트 관리 API - 파일 업로드 지원

const express = require('express');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwtAuth = require('../middleware/jwtAuth');
const DevEnvironmentService = require('../services/devEnvironmentService');
const CollaborationNotificationCenter = require('../services/collaborationNotificationCenter');

const router = express.Router();

// [advice from AI] Multer 설정 - 메모리 저장 방식 (DB 직접 저장용)
const upload = multer({
  storage: multer.memoryStorage(), // 메모리에 임시 저장
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 제한
    files: 10 // 최대 10개 파일
  },
  fileFilter: (req, file, cb) => {
    console.log('🔍 파일 필터 검사:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // 허용된 파일 타입 검증
    const allowedTypes = ['.pdf', '.doc', '.docx', '.hwp', '.ppt', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(ext)) {
      console.log('✅ 파일 타입 검증 통과:', ext);
      cb(null, true);
    } else {
      console.error('❌ 지원되지 않는 파일 타입:', ext);
      cb(new Error(`지원되지 않는 파일 형식입니다: ${ext}. 허용된 형식: ${allowedTypes.join(', ')}`));
    }
  }
});

console.log('✅ Multer 메모리 저장 방식으로 설정 완료 (DB 직접 저장용)');

// [advice from AI] PostgreSQL 연결 (domains.js와 동일한 방식)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'timbel_db',
  user: process.env.DB_USER || 'timbel_user',
  password: process.env.DB_PASSWORD || 'timbel_password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// [advice from AI] 프로젝트 목록 조회
router.get('/', jwtAuth.verifyToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const projectsResult = await client.query(`
      SELECT 
        p.*,
        d.name as domain_name,
        u1.full_name as created_by_name,
        u2.full_name as approved_by_name,
        COUNT(s.id) as connected_systems_count
      FROM projects p
      LEFT JOIN domains d ON p.domain_id = d.id
      LEFT JOIN timbel_users u1 ON p.created_by = u1.id
      LEFT JOIN timbel_users u2 ON p.approved_by = u2.id
      LEFT JOIN systems s ON s.project_id = p.id
      GROUP BY p.id, d.name, u1.full_name, u2.full_name
      ORDER BY 
        CASE p.urgency_level 
          WHEN 'critical' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          ELSE 4 
        END,
        p.deadline ASC,
        p.created_at DESC
    `);
    
    client.release();
    
    console.log(`프로젝트 목록 조회: ${projectsResult.rows.length}개`);
    
    res.json({
      success: true,
      data: projectsResult.rows
    });
    
  } catch (error) {
    console.error('프로젝트 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch projects',
      message: error.message
    });
  }
});

// [advice from AI] 테이블 생성 함수
const ensureTablesExist = async (client) => {
  try {
    // project_documents 테이블 생성 - DB 직접 저장 방식
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('voc', 'requirements', 'design')),
        original_filename VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        file_content BYTEA NOT NULL,
        title VARCHAR(255),
        description TEXT,
        uploaded_by UUID REFERENCES timbel_users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT file_size_limit CHECK (file_size <= 52428800)
      )
    `);
    
    // work_groups 테이블 생성
    await client.query(`
      CREATE TABLE IF NOT EXISTS work_groups (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_pe UUID REFERENCES timbel_users(id),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'on_hold')),
        order_index INTEGER DEFAULT 0,
        created_by UUID REFERENCES timbel_users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 인덱스 생성
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_documents_type ON project_documents(document_type);
      CREATE INDEX IF NOT EXISTS idx_work_groups_project_id ON work_groups(project_id);
      CREATE INDEX IF NOT EXISTS idx_work_groups_assigned_pe ON work_groups(assigned_pe);
    `);
    
    console.log('✅ 테이블 존재 확인/생성 완료');
  } catch (error) {
    console.error('❌ 테이블 생성 실패:', error);
    throw error;
  }
};

// [advice from AI] 프로젝트 생성 - 파일 업로드 및 작업 그룹 지원
router.post('/', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'po']), (req, res, next) => {
  // Multer 에러 처리
  upload.array('documents', 10)(req, res, (err) => {
    if (err) {
      console.error('❌ Multer 파일 업로드 오류:', err);
      return res.status(400).json({
        success: false,
        error: 'File upload error',
        message: err.message
      });
    }
    next();
  });
}, async (req, res) => {
  try {
    console.log('🎯 프로젝트 생성 요청 - 사용자:', req.user?.id, req.user?.roleType);
    console.log('🎯 업로드된 파일 개수:', req.files?.length || 0);
    
    // [advice from AI] 상세한 파일 수신 로그
    if (req.files && req.files.length > 0) {
      console.log('📁 수신된 파일들:');
      req.files.forEach((file, index) => {
        console.log(`  파일 ${index + 1}:`, {
          originalname: file.originalname,
          filename: file.filename,
          size: file.size,
          mimetype: file.mimetype,
          path: file.path
        });
      });
    } else {
      console.log('❌ 수신된 파일이 없습니다!');
      console.log('📋 req.body 키들:', Object.keys(req.body));
      console.log('📋 req.files 상태:', req.files);
    }
    
    const { 
      name, 
      domain_id, 
      project_overview, 
      target_system_name, 
      urgency_level, 
      deadline,
      similar_systems,
      work_groups,
      document_metadata // 프론트엔드에서 문서 메타데이터 전송
    } = req.body;
    
    // [advice from AI] JWT 사용자 ID를 실제 데이터베이스 UUID로 매핑
    const userIdMapping = {
      'admin-001': 'e512d6df-0396-4806-9c86-ff16ce312993',
      'po-001': '1a71adf6-daa1-4267-98f7-b99098945630',
      'pe-001': 'cb45aae6-4b47-4238-af31-5bbbeaa3d18c',
      'qa-001': 'a3cdd9a5-6dd0-465f-9160-7638464840fb',
      'op-001': '8d451115-5cbe-4093-b92e-5d44c21d2a92'
    };
    
    const userId = userIdMapping[req.user?.id] || 'e512d6df-0396-4806-9c86-ff16ce312993';
    
    console.log('🎯 매핑된 사용자 UUID:', userId);
    console.log('🎯 유사 시스템 개수:', similar_systems?.length || 0);
    console.log('🎯 작업 그룹 개수:', work_groups?.length || 0);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // [advice from AI] 테이블 존재 확인 및 생성
      await ensureTablesExist(client);
      
      // [advice from AI] 1. 프로젝트 생성
      const metadata = {
        similar_systems: similar_systems ? JSON.parse(similar_systems) : []
      };
      
      const projectResult = await client.query(`
        INSERT INTO projects (
          name, 
          domain_id, 
          project_overview, 
          target_system_name, 
          urgency_level, 
          deadline,
          metadata,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *
      `, [
        name, 
        domain_id, 
        project_overview, 
        target_system_name, 
        urgency_level || 'medium', 
        deadline,
        JSON.stringify(metadata),
        userId
      ]);
      
      const projectId = projectResult.rows[0].id;
      console.log('✅ 프로젝트 생성 완료:', projectResult.rows[0].name, 'ID:', projectId);
      
      // [advice from AI] 2. 프로젝트 문서 저장 - DB 직접 저장 방식
      if (req.files && req.files.length > 0) {
        console.log('📁 문서 DB 저장 시작...');
        console.log('  - document_metadata 원본:', document_metadata);
        
        const documentMetadataArray = document_metadata ? JSON.parse(document_metadata) : [];
        console.log('  - 파싱된 메타데이터:', documentMetadataArray);
        
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const docMeta = documentMetadataArray[i] || {};
          
          console.log(`📄 문서 ${i + 1} DB 저장:`, {
            projectId,
            document_type: docMeta.document_type || 'requirements',
            original_filename: file.originalname,
            file_size: file.size,
            mime_type: file.mimetype,
            title: docMeta.title || file.originalname,
            buffer_size: file.buffer.length
          });
          
          // 파일 크기 검증
          if (file.size > 50 * 1024 * 1024) {
            throw new Error(`파일 크기가 50MB를 초과합니다: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
          }
          
          // 파일 내용이 있는지 확인
          if (!file.buffer || file.buffer.length === 0) {
            throw new Error(`파일 내용이 비어있습니다: ${file.originalname}`);
          }
          
          const insertResult = await client.query(`
            INSERT INTO project_documents (
              project_id,
              document_type,
              original_filename,
              file_size,
              mime_type,
              file_content,
              title,
              description,
              uploaded_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, title, original_filename, file_size
          `, [
            projectId,
            docMeta.document_type || 'requirements',
            file.originalname,
            file.size,
            file.mimetype,
            file.buffer, // BYTEA로 파일 내용 직접 저장
            docMeta.title || file.originalname,
            docMeta.description || null,
            userId
          ]);
          
          console.log(`✅ 문서 ${i + 1} DB 저장 완료:`, {
            id: insertResult.rows[0].id,
            title: insertResult.rows[0].title,
            filename: insertResult.rows[0].original_filename,
            size: `${(insertResult.rows[0].file_size / 1024 / 1024).toFixed(2)}MB`
          });
        }
        console.log('✅ 전체 프로젝트 문서 DB 저장 완료:', req.files.length, '개');
      } else {
        console.log('ℹ️ 업로드할 문서가 없습니다.');
      }
      
      // [advice from AI] 3. 작업 그룹 저장
      if (work_groups) {
        const workGroupsArray = JSON.parse(work_groups);
        for (const group of workGroupsArray) {
          await client.query(`
            INSERT INTO work_groups (
              project_id,
              name,
              description,
              created_by
            ) VALUES ($1, $2, $3, $4)
          `, [
            projectId,
            group.name,
            group.description || null,
            userId
          ]);
        }
        console.log('✅ 작업 그룹 저장 완료:', workGroupsArray.length, '개');
      }
      
      await client.query('COMMIT');
      console.log('✅ 프로젝트 생성 트랜잭션 완료 by', req.user?.id);
      
      // [advice from AI] 프로젝트 생성 알림 전송
      try {
        const notificationCenter = new CollaborationNotificationCenter();
        const projectData = projectResult.rows[0];
        
        // 일반 프로젝트 생성 알림
        await notificationCenter.notifyProjectCreated(
          projectData.id,
          projectData.name,
          userId
        );
        
        // 긴급 개발 프로젝트인 경우 추가 알림
        if (projectData.is_urgent_development) {
          await notificationCenter.notifyUrgentProject(
            projectData.id,
            projectData.name,
            projectData.urgent_reason,
            projectData.expected_completion_hours,
            userId
          );
        }
        
        console.log('✅ 프로젝트 생성 알림 전송 완료');
      } catch (notificationError) {
        console.warn('⚠️ 프로젝트 생성 알림 전송 실패:', notificationError.message);
      }
      
      res.status(201).json({
        success: true,
        data: projectResult.rows[0],
        message: '프로젝트가 성공적으로 생성되었습니다.'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 생성 실패:', error);
    console.error('❌ 요청 사용자:', req.user?.id, req.user?.roleType);
    
    // [advice from AI] 업로드된 파일들 정리 (실패 시)
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        fs.unlink(file.path, (unlinkErr) => {
          if (unlinkErr) console.error('파일 삭제 실패:', file.path, unlinkErr);
        });
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create project',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 상세 조회 - 문서 및 작업 그룹 포함
router.get('/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🎯 프로젝트 상세 조회 요청:', id);
    
    const client = await pool.connect();
    
    try {
      // 테이블 존재 확인
      await ensureTablesExist(client);
      
      // 1. 기본 프로젝트 정보 조회
      console.log('📋 프로젝트 기본 정보 조회 시작 - ID:', id);
      
      const projectResult = await client.query(`
        SELECT 
          p.*,
          d.name as domain_name,
          u1.full_name as created_by_name,
          u2.full_name as approved_by_name,
          COUNT(s.id) as connected_systems_count
        FROM projects p
        LEFT JOIN domains d ON p.domain_id = d.id
        LEFT JOIN timbel_users u1 ON p.created_by = u1.id
        LEFT JOIN timbel_users u2 ON p.approved_by = u2.id
        LEFT JOIN systems s ON s.project_id = p.id
        WHERE p.id = $1
        GROUP BY p.id, d.name, u1.full_name, u2.full_name
      `, [id]);
      
      console.log('📋 프로젝트 조회 결과:', {
        found: projectResult.rows.length > 0,
        project_name: projectResult.rows[0]?.name || 'N/A'
      });
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      const project = projectResult.rows[0];
      
      // 2. 프로젝트 문서 조회 - file_content 제외 (용량 때문에)
      console.log('📁 문서 조회 시작 - 프로젝트 ID:', id);
      
      const documentsResult = await client.query(`
        SELECT 
          pd.id, pd.document_type, pd.original_filename, 
          pd.file_size, pd.mime_type, pd.title, pd.description,
          pd.uploaded_by, pd.created_at,
          u.full_name as uploaded_by_name
        FROM project_documents pd
        LEFT JOIN timbel_users u ON pd.uploaded_by = u.id
        WHERE pd.project_id = $1
        ORDER BY pd.created_at DESC
      `, [id]);
      
      console.log('📁 문서 조회 결과:', {
        project_id: id,
        found_documents: documentsResult.rows.length,
        documents: documentsResult.rows.map(doc => ({
          id: doc.id,
          title: doc.title,
          type: doc.document_type,
          filename: doc.original_filename,
          size: doc.file_size
        }))
      });
      
      // 3. 작업 그룹 조회
      console.log('👥 작업 그룹 조회 시작 - 프로젝트 ID:', id);
      
      const workGroupsResult = await client.query(`
        SELECT 
          wg.id, wg.name, wg.description, wg.assigned_pe, wg.status, wg.order_index,
          wg.created_by, wg.created_at,
          u1.full_name as created_by_name,
          u2.full_name as assigned_pe_name
        FROM work_groups wg
        LEFT JOIN timbel_users u1 ON wg.created_by = u1.id
        LEFT JOIN timbel_users u2 ON wg.assigned_pe = u2.id
        WHERE wg.project_id = $1
        ORDER BY wg.order_index ASC, wg.created_at ASC
      `, [id]);
      
      console.log('👥 작업 그룹 조회 결과:', {
        project_id: id,
        found_workgroups: workGroupsResult.rows.length
      });
      
      // [advice from AI] metadata 파싱 처리
      let metadata = {};
      let similar_systems = [];
      
      try {
        if (project.metadata) {
          metadata = typeof project.metadata === 'string' ? JSON.parse(project.metadata) : project.metadata;
          similar_systems = metadata.similar_systems || [];
        }
      } catch (parseError) {
        console.warn('⚠️ 메타데이터 파싱 실패:', parseError);
        metadata = {};
        similar_systems = [];
      }
      
      // 결과 조합
      const detailedProject = {
        ...project,
        metadata,
        documents: documentsResult.rows,
        work_groups: workGroupsResult.rows,
        similar_systems
      };
      
      console.log('✅ 프로젝트 상세 조회 완료:', project.name);
      console.log('  - 문서 개수:', documentsResult.rows.length);
      console.log('  - 작업 그룹 개수:', workGroupsResult.rows.length);
      console.log('  - 유사 시스템 개수:', similar_systems.length);
      
      // 최종 응답 데이터 로그
      console.log('📤 최종 응답 데이터 구조:');
      console.log('  - detailedProject.documents:', detailedProject.documents?.length || 0);
      console.log('  - detailedProject.work_groups:', detailedProject.work_groups?.length || 0);
      console.log('  - detailedProject.similar_systems:', detailedProject.similar_systems?.length || 0);
      
      if (documentsResult.rows.length > 0) {
        console.log('📁 첫 번째 문서 샘플:', {
          id: documentsResult.rows[0].id,
          title: documentsResult.rows[0].title,
          type: documentsResult.rows[0].document_type,
          filename: documentsResult.rows[0].original_filename
        });
      }
      
      // UTF-8 인코딩 명시적 설정
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      
      res.json({
        success: true,
        data: detailedProject
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch project details',
      message: error.message
    });
  }
});

// [advice from AI] 문서 다운로드 API - DB에서 직접 읽기
router.get('/:projectId/documents/:documentId/download', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { projectId, documentId } = req.params;
    console.log('🎯 문서 다운로드 요청 (DB에서):', projectId, documentId);
    
    const client = await pool.connect();
    
    try {
      // 문서 정보 및 파일 내용 조회
      const documentResult = await client.query(`
        SELECT 
          original_filename, 
          mime_type, 
          file_size,
          file_content,
          title
        FROM project_documents 
        WHERE id = $1 AND project_id = $2
      `, [documentId, projectId]);
      
      if (documentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        });
      }
      
      const document = documentResult.rows[0];
      
      console.log('📄 문서 정보:', {
        filename: document.original_filename,
        size: `${(document.file_size / 1024 / 1024).toFixed(2)}MB`,
        mime_type: document.mime_type,
        content_length: document.file_content.length
      });
      
      // 파일 내용이 있는지 확인
      if (!document.file_content || document.file_content.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'File content is empty'
        });
      }
      
      // 파일 다운로드 응답 헤더 설정 - 한글 파일명 지원
      const encodedFilename = encodeURIComponent(document.original_filename);
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}; filename="${encodedFilename}"`);
      res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
      res.setHeader('Content-Length', document.file_content.length);
      res.setHeader('Cache-Control', 'no-cache');
      
      // 파일 내용 직접 전송
      res.send(document.file_content);
      
      console.log('✅ 문서 다운로드 완료 (DB에서):', document.original_filename);
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 문서 다운로드 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download document',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 수정 API - 파일 업로드 및 모든 데이터 지원
router.put('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'po']), upload.array('new_documents', 10), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🎯 프로젝트 수정 요청:', id, '- 사용자:', req.user?.id, req.user?.roleType);
    
    const { 
      name, 
      domain_id, 
      project_overview, 
      target_system_name, 
      urgency_level, 
      deadline,
      project_status,
      similar_systems,
      work_groups,
      new_document_metadata,
      removed_document_ids
    } = req.body;
    
    console.log('🎯 업로드된 새 문서 개수:', req.files?.length || 0);
    console.log('🎯 삭제할 문서 개수:', removed_document_ids ? JSON.parse(removed_document_ids).length : 0);
    
    // [advice from AI] JWT 사용자 ID 매핑
    const userIdMapping = {
      'admin-001': 'e512d6df-0396-4806-9c86-ff16ce312993',
      'po-001': '1a71adf6-daa1-4267-98f7-b99098945630',
      'pe-001': 'cb45aae6-4b47-4238-af31-5bbbeaa3d18c',
      'qa-001': 'a3cdd9a5-6dd0-465f-9160-7638464840fb',
      'op-001': '8d451115-5cbe-4093-b92e-5d44c21d2a92'
    };
    
    const userId = userIdMapping[req.user?.id] || 'e512d6df-0396-4806-9c86-ff16ce312993';
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 테이블 존재 확인
      await ensureTablesExist(client);
      
      // 프로젝트 존재 확인
      const existingProject = await client.query('SELECT * FROM projects WHERE id = $1', [id]);
      
      if (existingProject.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      // [advice from AI] 1. 프로젝트 기본 정보 수정
      const metadata = {
        similar_systems: similar_systems ? JSON.parse(similar_systems) : []
      };
      
      const projectResult = await client.query(`
        UPDATE projects SET
          name = $1,
          domain_id = $2,
          project_overview = $3,
          target_system_name = $4,
          urgency_level = $5,
          deadline = $6,
          project_status = $7,
          metadata = $8,
          updated_at = NOW()
        WHERE id = $9
        RETURNING *
      `, [
        name, 
        domain_id, 
        project_overview, 
        target_system_name, 
        urgency_level || 'medium', 
        deadline,
        project_status || 'planning',
        JSON.stringify(metadata),
        id
      ]);
      
      console.log('✅ 프로젝트 기본 정보 수정 완료');
      
      // [advice from AI] 2. 삭제된 문서 처리 - DB에서 직접 삭제
      if (removed_document_ids) {
        const removedIds = JSON.parse(removed_document_ids);
        if (removedIds.length > 0) {
          // 삭제될 문서 정보 조회 (로깅용)
          const documentsToDelete = await client.query(`
            SELECT original_filename FROM project_documents 
            WHERE id = ANY($1) AND project_id = $2
          `, [removedIds, id]);
          
          // 데이터베이스에서 문서 레코드 삭제 (파일 내용도 함께 삭제됨)
          await client.query(`
            DELETE FROM project_documents 
            WHERE id = ANY($1) AND project_id = $2
          `, [removedIds, id]);
          
          console.log('✅ 문서 삭제 완료:', removedIds.length, '개');
          documentsToDelete.rows.forEach(doc => {
            console.log('  - 삭제된 문서:', doc.original_filename);
          });
        }
      }
      
      // [advice from AI] 3. 새 문서 추가 - DB 직접 저장
      if (req.files && req.files.length > 0) {
        const documentMetadataArray = new_document_metadata ? JSON.parse(new_document_metadata) : [];
        
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const docMeta = documentMetadataArray[i] || {};
          
          console.log(`📄 새 문서 ${i + 1} DB 저장:`, {
            document_type: docMeta.document_type || 'requirements',
            original_filename: file.originalname,
            file_size: file.size,
            mime_type: file.mimetype,
            title: docMeta.title || file.originalname,
            buffer_size: file.buffer.length
          });
          
          // 파일 크기 검증
          if (file.size > 50 * 1024 * 1024) {
            throw new Error(`파일 크기가 50MB를 초과합니다: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
          }
          
          // 파일 내용이 있는지 확인
          if (!file.buffer || file.buffer.length === 0) {
            throw new Error(`파일 내용이 비어있습니다: ${file.originalname}`);
          }
          
          const insertResult = await client.query(`
            INSERT INTO project_documents (
              project_id,
              document_type,
              original_filename,
              file_size,
              mime_type,
              file_content,
              title,
              description,
              uploaded_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, title, original_filename, file_size
          `, [
            id,
            docMeta.document_type || 'requirements',
            file.originalname,
            file.size,
            file.mimetype,
            file.buffer, // BYTEA로 파일 내용 직접 저장
            docMeta.title || file.originalname,
            docMeta.description || null,
            userId
          ]);
          
          console.log(`✅ 새 문서 ${i + 1} DB 저장 완료:`, {
            id: insertResult.rows[0].id,
            title: insertResult.rows[0].title,
            filename: insertResult.rows[0].original_filename,
            size: `${(insertResult.rows[0].file_size / 1024 / 1024).toFixed(2)}MB`
          });
        }
        console.log('✅ 새 문서 DB 저장 완료:', req.files.length, '개');
      }
      
      // [advice from AI] 4. 작업 그룹 수정 (기존 삭제 후 재생성)
      if (work_groups) {
        // 기존 작업 그룹 삭제
        await client.query('DELETE FROM work_groups WHERE project_id = $1', [id]);
        
        // 새 작업 그룹 생성
        const workGroupsArray = JSON.parse(work_groups);
        for (const group of workGroupsArray) {
          await client.query(`
            INSERT INTO work_groups (
              project_id,
              name,
              description,
              assigned_pe,
              status,
              created_by
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            id,
            group.name,
            group.description || null,
            group.assigned_pe || null,
            group.status || 'pending',
            userId
          ]);
        }
        console.log('✅ 작업 그룹 수정 완료:', workGroupsArray.length, '개');
      }
      
      await client.query('COMMIT');
      console.log('✅ 프로젝트 수정 트랜잭션 완료 by', req.user?.id);
      
      res.json({
        success: true,
        data: projectResult.rows[0],
        message: '프로젝트가 성공적으로 수정되었습니다.'
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      // [advice from AI] 업로드된 새 파일들 정리 (실패 시)
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          fs.unlink(file.path, (unlinkErr) => {
            if (unlinkErr) console.error('파일 삭제 실패:', file.path, unlinkErr);
          });
        });
      }
      
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 수정 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 삭제 API - 관련 파일 및 데이터 모두 삭제
router.delete('/:id', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive']), async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ 프로젝트 삭제 요청:', id, '- 사용자:', req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 테이블 존재 확인
      await ensureTablesExist(client);
      
      // 프로젝트 존재 확인
      const existingProject = await client.query('SELECT name FROM projects WHERE id = $1', [id]);
      
      if (existingProject.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      const projectName = existingProject.rows[0].name;
      
      // [advice from AI] 1. 프로젝트 문서 조회 및 삭제 - DB 직접 저장 방식
      const documentsToDelete = await client.query(`
        SELECT original_filename, file_size
        FROM project_documents 
        WHERE project_id = $1
      `, [id]);
      
      // [advice from AI] 2. 관련 데이터 삭제 - DB에서 파일 내용도 함께 삭제
      await client.query('DELETE FROM project_documents WHERE project_id = $1', [id]);
      
      let totalDeletedSize = 0;
      documentsToDelete.rows.forEach(doc => {
        totalDeletedSize += doc.file_size;
        console.log('✅ 문서 삭제 완료 (DB에서):', doc.original_filename, `(${(doc.file_size / 1024 / 1024).toFixed(2)}MB)`);
      });
      
      console.log('✅ 프로젝트 문서 삭제 완료:', documentsToDelete.rows.length, '개', `(총 ${(totalDeletedSize / 1024 / 1024).toFixed(2)}MB)`);
      
      await client.query('DELETE FROM work_groups WHERE project_id = $1', [id]);
      console.log('✅ 작업 그룹 삭제 완료');
      
      // [advice from AI] 3. 연결된 시스템 해제 (project_id를 NULL로 설정)
      const systemsResult = await client.query(`
        UPDATE systems SET project_id = NULL 
        WHERE project_id = $1 
        RETURNING name
      `, [id]);
      
      if (systemsResult.rows.length > 0) {
        console.log('✅ 연결된 시스템 해제 완료:', systemsResult.rows.length, '개');
      }
      
      // [advice from AI] 4. 프로젝트 삭제
      await client.query('DELETE FROM projects WHERE id = $1', [id]);
      
      await client.query('COMMIT');
      
      console.log('✅ 프로젝트 완전 삭제 완료:', projectName, 'by', req.user?.id);
      
      res.json({
        success: true,
        message: `프로젝트 "${projectName}"가 성공적으로 삭제되었습니다.`,
        deleted_files: documentsToDelete.rows.length,
        unlinked_systems: systemsResult.rows.length
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 삭제 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project',
      message: error.message
    });
  }
});

// [advice from AI] 승인된 프로젝트 목록 조회 (PO용)
router.get('/list/approved', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    console.log('🔍 승인된 프로젝트 조회 요청 - 사용자:', req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT 
          p.*,
          d.name as domain_name,
          creator.full_name as created_by_name,
          approver.full_name as approved_by_name,
          COUNT(pd.id) as document_count,
          COUNT(wg.id) as work_group_count
        FROM projects p
        LEFT JOIN domains d ON p.domain_id = d.id
        LEFT JOIN timbel_users creator ON p.created_by = creator.id
        LEFT JOIN timbel_users approver ON p.approved_by = approver.id
        LEFT JOIN project_documents pd ON p.id = pd.project_id
        LEFT JOIN work_groups wg ON p.id = wg.project_id
        WHERE p.approval_status = 'approved'
        GROUP BY p.id, d.name, creator.full_name, approver.full_name
        ORDER BY 
          CASE p.urgency_level 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END,
          p.updated_at DESC
      `);
      
      // 각 프로젝트의 작업 그룹 정보도 함께 조회
      for (const project of result.rows) {
        const workGroupsResult = await client.query(`
          SELECT id, name, description, assigned_pe, status
          FROM work_groups 
          WHERE project_id = $1
          ORDER BY created_at
        `, [project.id]);
        
        project.work_groups = workGroupsResult.rows;
      }
      
      client.release();
      
      console.log('✅ 승인된 프로젝트 조회 완료:', result.rows.length, '개');
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 승인된 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch approved projects',
      message: error.message
    });
  }
});

// [advice from AI] PE 사용자 목록 조회

// [advice from AI] PE 할당 처리
router.post('/:id/assign-pe', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const { id } = req.params;
    const { assignments } = req.body; // [{ work_group_id, assigned_to, assignment_notes }]
    
    console.log('🎯 PE 할당 처리 요청:', id, '- 사용자:', req.user?.userId || req.user?.id, req.user?.roleType);
    console.log('📋 할당 정보:', assignments);
    console.log('🔍 JWT 사용자 정보:', JSON.stringify(req.user, null, 2));
    
    // [advice from AI] JWT에서 사용자 ID 확인 및 검증 (userId 또는 id 필드 지원)
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        message: '사용자 인증 정보를 찾을 수 없습니다.'
      });
    }
    
    console.log('👤 할당 처리자 ID:', userId);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 프로젝트 존재 및 상태 확인
      const projectCheck = await client.query(`
        SELECT name, approval_status, project_status 
        FROM projects 
        WHERE id = $1
      `, [id]);
      
      if (projectCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      const projectName = projectCheck.rows[0].name;
      const approvalStatus = projectCheck.rows[0].approval_status;
      const projectStatus = projectCheck.rows[0].project_status;
      
      if (approvalStatus !== 'approved') {
        return res.status(400).json({
          success: false,
          error: 'Project is not approved',
          message: `프로젝트가 승인되지 않았습니다. 현재 상태: ${approvalStatus}`
        });
      }
      
      if (projectStatus !== 'planning') {
        return res.status(400).json({
          success: false,
          error: 'Project is already assigned',
          message: `프로젝트가 이미 할당되었습니다. 현재 상태: ${projectStatus}`
        });
      }
      
      // 프로젝트의 작업 그룹 확인
      const projectWorkGroups = await client.query(`
        SELECT id, name FROM work_groups WHERE project_id = $1
      `, [id]);
      
      console.log('📋 프로젝트 작업 그룹:', projectWorkGroups.rows.length, '개');
      
      // 작업 그룹이 없는 경우 - 전체 프로젝트를 하나의 PE에게 할당
      if (projectWorkGroups.rows.length === 0) {
        console.log('⚠️ 작업 그룹이 없는 프로젝트 - 전체 할당 모드');
        
        if (assignments.length !== 1) {
          throw new Error('작업 그룹이 없는 프로젝트는 하나의 PE에게만 할당할 수 있습니다.');
        }
        
        const { assigned_to, assignment_notes } = assignments[0];
        
        // PE 사용자 존재 확인
        const peCheck = await client.query(`
          SELECT full_name FROM timbel_users WHERE id = $1 AND role_type = 'pe'
        `, [assigned_to]);
        
        if (peCheck.rows.length === 0) {
          throw new Error(`PE 사용자를 찾을 수 없습니다: ${assigned_to}`);
        }
        
        // [advice from AI] 중복 할당 방지: 기존 할당 확인
        const existingAssignment = await client.query(
          'SELECT id FROM project_work_assignments WHERE project_id = $1 AND assigned_to = $2',
          [projectId, assigned_to]
        );
        
        if (existingAssignment.rows.length === 0) {
          // project_work_assignments에 전체 프로젝트 할당 정보 저장
          await client.query(`
            INSERT INTO project_work_assignments (
              project_id, work_group_id, assigned_by, assigned_to,
              assignment_type, assignment_status, assignment_notes,
              assigned_at, start_date
            ) VALUES ($1, NULL, $2, $3, $4, $5, $6, NOW(), CURRENT_DATE)
          `, [
          id, userId, assigned_to,
          'development', 'assigned', assignment_notes || null
        ]);
        
        console.log('✅ 전체 프로젝트 할당 완료:', projectName, '→', peCheck.rows[0].full_name);
        } else {
          console.log('⚠️ 이미 할당된 PE입니다:', peCheck.rows[0].full_name);
        }
        
      } else {
        // 작업 그룹이 있는 경우 - 각 작업 그룹별로 PE 할당
        console.log('📊 작업 그룹별 PE 할당 모드');
        
        // 모든 작업 그룹이 할당되었는지 확인
        const assignedWorkGroupIds = assignments.map(a => a.work_group_id);
        const unassignedGroups = projectWorkGroups.rows.filter(
          wg => !assignedWorkGroupIds.includes(wg.id)
        );
        
        if (unassignedGroups.length > 0) {
          throw new Error(`다음 작업 그룹들이 할당되지 않았습니다: ${unassignedGroups.map(wg => wg.name).join(', ')}`);
        }
        
        // 각 할당에 대해 처리
        for (const assignment of assignments) {
          const { work_group_id, assigned_to, assignment_notes } = assignment;
          
          // 작업 그룹 존재 확인
          const workGroupCheck = await client.query(`
            SELECT name FROM work_groups WHERE id = $1 AND project_id = $2
          `, [work_group_id, id]);
          
          if (workGroupCheck.rows.length === 0) {
            throw new Error(`작업 그룹을 찾을 수 없습니다: ${work_group_id}`);
          }
          
          // PE 사용자 존재 확인
          const peCheck = await client.query(`
            SELECT full_name FROM timbel_users WHERE id = $1 AND role_type = 'pe'
          `, [assigned_to]);
          
          if (peCheck.rows.length === 0) {
            throw new Error(`PE 사용자를 찾을 수 없습니다: ${assigned_to}`);
          }
          
          // [advice from AI] 중복 할당 방지: 기존 할당 확인
          const existingAssignment = await client.query(
            'SELECT id FROM project_work_assignments WHERE project_id = $1 AND assigned_to = $2',
            [projectId, assigned_to]
          );
          
          if (existingAssignment.rows.length === 0) {
            // project_work_assignments에 할당 정보 저장
            await client.query(`
              INSERT INTO project_work_assignments (
                project_id, work_group_id, assigned_by, assigned_to,
                assignment_type, assignment_status, assignment_notes,
                assigned_at, start_date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), CURRENT_DATE)
            `, [
            id, work_group_id, userId, assigned_to,
            'development', 'assigned', assignment_notes || null
          ]);
          } else {
            console.log('⚠️ 이미 할당된 PE입니다:', peCheck.rows[0].full_name);
          }
          
          // work_groups 테이블의 assigned_pe 업데이트
          await client.query(`
            UPDATE work_groups 
            SET assigned_pe = $1, status = 'assigned'
            WHERE id = $2
          `, [assigned_to, work_group_id]);
          
          console.log('✅ 작업 그룹 할당 완료:', workGroupCheck.rows[0].name, '→', peCheck.rows[0].full_name);
        }
      }
      
            // 프로젝트 상태를 'in_progress'로 업데이트
            await client.query(`
              UPDATE projects 
              SET project_status = 'in_progress', updated_at = NOW()
              WHERE id = $1
            `, [id]);
            
            await client.query('COMMIT');
            
            console.log('✅ PE 할당 처리 완료:', projectName, '- 할당 건수:', assignments.length);
            
            // 개발 환경 자동 설정
            let devEnvironmentResult = null;
            try {
              const devEnvironmentService = new DevEnvironmentService();
              
              // PE 할당 정보 준비
              const peAssignments = assignments.map(assignment => ({
                ...assignment,
                work_group_name: assignment.work_group_id ? 
                  projectWorkGroups.rows.find(wg => wg.id === assignment.work_group_id)?.name || 'main' : 'main',
                pe_name: 'PE Developer' // 실제로는 PE 사용자 정보에서 가져와야 함
              }));
              
              devEnvironmentResult = await devEnvironmentService.initializeProjectEnvironment(
                {
                  id,
                  name: projectName,
                  project_overview: '프로젝트 개요', // 실제로는 프로젝트 데이터에서 가져와야 함
                  urgency_level: 'medium'
                },
                peAssignments
              );
              
              console.log('🚀 개발 환경 자동 설정 완료:', devEnvironmentResult.repositories.length, '개 레포지토리');
              
            } catch (devError) {
              console.error('⚠️ 개발 환경 자동 설정 실패 (프로젝트 할당은 성공):', devError);
              // 개발 환경 설정 실패는 치명적이지 않으므로 로그만 남기고 계속 진행
            }
            
            res.json({
              success: true,
              message: `프로젝트 "${projectName}"가 PE에게 성공적으로 할당되었습니다.`,
              data: {
                project_id: id,
                assignments_count: assignments.length,
                development_environment: devEnvironmentResult ? {
                  repositories_created: devEnvironmentResult.repositories.length,
                  project_directory: devEnvironmentResult.development_setup.project_directory,
                  pe_access_granted: devEnvironmentResult.pe_access_granted.length
                } : null
              }
            });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PE 할당 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign PE',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 상태 업데이트
router.put('/:id/status', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    const { id } = req.params;
    const { project_status, status_comment } = req.body;
    
    console.log('📝 프로젝트 상태 업데이트 요청:', id, '- 새 상태:', project_status, '- 사용자:', req.user?.id);
    
    const userId = userIdMapping[req.user?.id] || userIdMapping['po-001'];
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 프로젝트 존재 확인
      const projectCheck = await client.query(`
        SELECT name, project_status FROM projects WHERE id = $1
      `, [id]);
      
      if (projectCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Project not found'
        });
      }
      
      const projectName = projectCheck.rows[0].name;
      const oldStatus = projectCheck.rows[0].project_status;
      
      // 프로젝트 상태 업데이트
      await client.query(`
        UPDATE projects 
        SET project_status = $1, updated_at = NOW()
        WHERE id = $2
      `, [project_status, id]);
      
      // 상태 변경 이력 저장 (선택사항)
      if (status_comment) {
        await client.query(`
          INSERT INTO project_status_history (
            project_id, old_status, new_status, changed_by, change_comment, changed_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `, [id, oldStatus, project_status, userId, status_comment]);
      }
      
      await client.query('COMMIT');
      
      console.log('✅ 프로젝트 상태 업데이트 완료:', projectName, oldStatus, '→', project_status);
      
      res.json({
        success: true,
        message: `프로젝트 "${projectName}"의 상태가 "${project_status}"로 업데이트되었습니다.`,
        data: {
          project_id: id,
          old_status: oldStatus,
          new_status: project_status
        }
      });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 상태 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project status',
      message: error.message
    });
  }
});

// [advice from AI] PE가 할당받은 프로젝트 목록 조회 API
router.get('/assigned/me', jwtAuth.verifyToken, jwtAuth.requireRole(['pe', 'admin']), async (req, res) => {
  try {
    console.log('📋 PE 할당 프로젝트 조회 요청 - 사용자:', req.user?.userId || req.user?.id, req.user?.roleType);
    
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        message: '사용자 인증 정보를 찾을 수 없습니다.'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // PE에게 할당된 프로젝트와 작업 그룹 조회
      const result = await client.query(`
        SELECT
          p.id as project_id,
          p.name as project_name,
          p.project_overview,
          p.target_system_name,
          p.urgency_level,
          p.deadline,
          p.project_status,
          p.created_at,
          d.name as domain_name,
          pwa.id as assignment_id,
          pwa.work_group_id,
          pwa.assignment_status,
          pwa.progress_percentage,
          pwa.assigned_at,
          pwa.start_date,
          pwa.due_date,
          pwa.assignment_notes,
          wg.name as work_group_name,
          wg.description as work_group_description,
          creator.full_name as created_by_name
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        LEFT JOIN domains d ON p.domain_id = d.id
        LEFT JOIN work_groups wg ON pwa.work_group_id = wg.id
        LEFT JOIN timbel_users creator ON p.created_by = creator.id
        WHERE pwa.assigned_to = $1
          AND pwa.assignment_status IN ('assigned', 'in_progress')
        ORDER BY 
          CASE p.urgency_level 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END,
          pwa.assigned_at DESC
      `, [userId]);
      
      console.log(`✅ PE 할당 프로젝트 조회 완료: ${result.rows.length}개`);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PE 할당 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assigned projects',
      message: error.message
    });
  }
});

// [advice from AI] 특정 PE의 할당된 프로젝트 조회 API (Admin용)
router.get('/assigned/:peUserId', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive']), async (req, res) => {
  try {
    const { peUserId } = req.params;
    console.log('📋 특정 PE 할당 프로젝트 조회 요청 - PE ID:', peUserId, '요청자:', req.user?.userId || req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    
    try {
      // PE에게 할당된 프로젝트와 작업 그룹 조회
      const result = await client.query(`
        SELECT
          p.id as project_id,
          p.name as project_name,
          p.project_overview,
          p.target_system_name,
          p.urgency_level,
          p.deadline,
          p.project_status,
          p.created_at,
          d.name as domain_name,
          pwa.id as assignment_id,
          pwa.work_group_id,
          pwa.assignment_status,
          pwa.progress_percentage,
          pwa.assigned_at,
          pwa.start_date,
          pwa.due_date,
          pwa.assignment_notes,
          wg.name as work_group_name,
          wg.description as work_group_description,
          creator.full_name as created_by_name,
          pe_user.full_name as assigned_pe_name
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        LEFT JOIN domains d ON p.domain_id = d.id
        LEFT JOIN work_groups wg ON pwa.work_group_id = wg.id
        LEFT JOIN timbel_users creator ON p.created_by = creator.id
        LEFT JOIN timbel_users pe_user ON pwa.assigned_to = pe_user.id
        WHERE pwa.assigned_to = $1
          AND pwa.assignment_status IN ('assigned', 'in_progress')
        ORDER BY 
          CASE p.urgency_level 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            ELSE 4 
          END,
          pwa.assigned_at DESC
      `, [peUserId]);
      
      console.log(`✅ 특정 PE 할당 프로젝트 조회 완료: ${result.rows.length}개`);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 특정 PE 할당 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PE assigned projects',
      message: error.message
    });
  }
});

// [advice from AI] PE 사용자 목록 조회 API
router.get('/list/users/pe', jwtAuth.verifyToken, jwtAuth.requireRole(['po', 'admin', 'executive']), async (req, res) => {
  try {
    console.log('👥 PE 사용자 목록 조회 요청');
    
    const client = await pool.connect();
    
    try {
      // PE 사용자 목록과 현재 작업량 조회
      const peUsersResult = await client.query(`
        SELECT 
          u.id,
          u.username,
          u.full_name,
          u.email,
          COUNT(pwa.id) as current_assignments,
          CASE 
            WHEN COUNT(pwa.id) >= 5 THEN 'high'
            WHEN COUNT(pwa.id) >= 3 THEN 'medium'
            ELSE 'low'
          END as workload_level
        FROM timbel_users u
        LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_to 
          AND pwa.assignment_status IN ('assigned', 'in_progress')
        WHERE u.role_type = 'pe' AND u.status = 'active'
        GROUP BY u.id, u.username, u.full_name, u.email
        ORDER BY u.full_name
      `);
      
      console.log(`✅ PE 사용자 ${peUsersResult.rows.length}명 조회 완료`);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: peUsersResult.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PE 사용자 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch PE users',
      message: error.message
    });
  }
});

// [advice from AI] PE 할당된 프로젝트 조회 API
router.get('/assigned/me', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📋 PE 할당 프로젝트 조회 요청 - 사용자:', req.user?.userId || req.user?.id, req.user?.roleType);
    
    const userId = req.user?.userId || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '사용자 인증 정보를 찾을 수 없습니다.'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // PE에게 할당된 프로젝트와 작업 그룹 조회
      const result = await client.query(`
        SELECT 
          p.id as project_id,
          p.name as project_name,
          p.project_overview,
          p.target_system_name,
          p.urgency_level,
          p.deadline,
          p.project_status,
          p.created_at,
          d.name as domain_name,
          pwa.id as assignment_id,
          pwa.work_group_id,
          pwa.assignment_status,
          pwa.progress_percentage,
          pwa.assigned_at,
          pwa.start_date,
          pwa.due_date,
          pwa.assignment_notes,
          wg.name as work_group_name,
          wg.description as work_group_description,
          creator.full_name as created_by_name
        FROM project_work_assignments pwa
        JOIN projects p ON p.id = pwa.project_id
        LEFT JOIN domains d ON d.id = p.domain_id
        LEFT JOIN work_groups wg ON wg.id = pwa.work_group_id
        LEFT JOIN timbel_users creator ON creator.id = p.created_by
        WHERE pwa.assigned_to = $1
          AND pwa.assignment_status IN ('assigned', 'in_progress', 'review')
        ORDER BY pwa.assigned_at DESC
      `, [userId]);

      console.log(`✅ PE 할당 프로젝트 ${result.rows.length}개 조회 완료`);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PE 할당 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assigned projects',
      message: error.message
    });
  }
});

// [advice from AI] 특정 PE 할당된 프로젝트 조회 API (Admin/PO용)
router.get('/assigned/:peUserId', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'executive', 'po']), async (req, res) => {
  try {
    const { peUserId } = req.params;
    console.log('📋 특정 PE 할당 프로젝트 조회 요청 - PE ID:', peUserId, '요청자:', req.user?.userId || req.user?.id, req.user?.roleType);
    
    const client = await pool.connect();
    
    try {
      // 특정 PE에게 할당된 프로젝트와 작업 그룹 조회
      const result = await client.query(`
        SELECT 
          p.id as project_id,
          p.name as project_name,
          p.project_overview,
          p.target_system_name,
          p.urgency_level,
          p.deadline,
          p.project_status,
          p.created_at,
          d.name as domain_name,
          pwa.id as assignment_id,
          pwa.work_group_id,
          pwa.assignment_status,
          pwa.progress_percentage,
          pwa.assigned_at,
          pwa.start_date,
          pwa.due_date,
          pwa.assignment_notes,
          wg.name as work_group_name,
          wg.description as work_group_description,
          creator.full_name as created_by_name
        FROM project_work_assignments pwa
        JOIN projects p ON p.id = pwa.project_id
        LEFT JOIN domains d ON d.id = p.domain_id
        LEFT JOIN work_groups wg ON wg.id = pwa.work_group_id
        LEFT JOIN timbel_users creator ON creator.id = p.created_by
        WHERE pwa.assigned_to = $1
          AND pwa.assignment_status IN ('assigned', 'in_progress', 'review')
        ORDER BY pwa.assigned_at DESC
      `, [peUserId]);

      console.log(`✅ 특정 PE 할당 프로젝트 ${result.rows.length}개 조회 완료`);
      
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({
        success: true,
        data: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 특정 PE 할당 프로젝트 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assigned projects for PE',
      message: error.message
    });
  }
});

module.exports = router;
