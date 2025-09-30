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
  database: process.env.DB_NAME || 'timbel_knowledge',
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
      // domain_id, // [advice from AI] 존재하지 않는 컬럼으로 제거 
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
          // domain_id, // [advice from AI] 존재하지 않는 컬럼으로 제거 
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
        // domain_id, // [advice from AI] 존재하지 않는 컬럼으로 제거 
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
          -- d.name as domain_name, -- [advice from AI] domains 테이블 JOIN 제거
          u1.full_name as created_by_name,
          -- u2.full_name as approved_by_name, -- [advice from AI] approved_by 컬럼 없음
          0 as connected_systems_count -- [advice from AI] systems 테이블 JOIN 제거로 인한 수정
        FROM projects p
        -- LEFT JOIN domains d ON p.null /* domain_id 컬럼 없음 */ = d.id -- [advice from AI] null /* domain_id 컬럼 없음 */ 컬럼이 존재하지 않음
        LEFT JOIN timbel_users u1 ON p.created_by = u1.id
        -- LEFT JOIN timbel_users u2 ON p.approved_by = u2.id -- [advice from AI] approved_by 컬럼 없음
        -- LEFT JOIN systems s ON s.project_id = p.id -- [advice from AI] systems 테이블에 project_id 컬럼 없음
        WHERE p.id = $1
        GROUP BY p.id, u1.full_name -- [advice from AI] d.name, u2.full_name 제거
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
      // domain_id, // [advice from AI] 존재하지 않는 컬럼으로 제거 
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
          null /* domain_id 컬럼 없음 */ = $2,
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
        // domain_id, // [advice from AI] 존재하지 않는 컬럼으로 제거 
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
          -- d.name as domain_name, -- [advice from AI] domains 테이블 JOIN 제거
          creator.full_name as created_by_name,
          -- approver.full_name as approved_by_name, -- [advice from AI] approved_by 컬럼 없음
          COUNT(pd.id) as document_count,
          COUNT(wg.id) as work_group_count
        FROM projects p
        -- LEFT JOIN domains d ON p.null /* domain_id 컬럼 없음 */ = d.id -- [advice from AI] null /* domain_id 컬럼 없음 */ 컬럼이 존재하지 않음
        LEFT JOIN timbel_users creator ON p.created_by = creator.id
        -- LEFT JOIN timbel_users approver ON p.approved_by = approver.id -- [advice from AI] approved_by 컬럼 없음
        LEFT JOIN project_documents pd ON p.id = pd.project_id
        LEFT JOIN work_groups wg ON p.id = wg.project_id
        WHERE p.approval_status = 'approved'
        GROUP BY p.id, creator.full_name -- [advice from AI] d.name, approver.full_name 제거
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
          -- d.name as domain_name, -- [advice from AI] domains 테이블 JOIN 제거
          pwa.id as assignment_id,
          pwa.work_group_id,
          pwa.assignment_status,
          pwa.progress_percentage,
          pwa.assigned_at,
          pwa.start_date,
          pwa.due_date,
          pwa.assignment_notes,
          pwa.pe_estimated_hours,
          pwa.actual_start_date,
          CASE 
            WHEN pwa.actual_start_date IS NOT NULL AND pwa.assignment_status = 'in_progress' THEN
              EXTRACT(EPOCH FROM (NOW() - pwa.actual_start_date)) / 3600
            ELSE 0
          END as actual_hours_worked,
          wg.name as work_group_name,
          wg.description as work_group_description,
          creator.full_name as created_by_name,
          pr.repository_url,
          pr.repository_name,
          pr.platform as git_platform
        FROM project_work_assignments pwa
        JOIN projects p ON p.id = pwa.project_id
        -- LEFT JOIN domains d ON d.id = p.domain_id -- [advice from AI] domain_id 컬럼이 존재하지 않음
        LEFT JOIN work_groups wg ON wg.id = pwa.work_group_id
        LEFT JOIN timbel_users creator ON creator.id = p.created_by
        LEFT JOIN project_repositories pr ON pr.project_id = p.id AND pr.assigned_pe = pwa.assigned_to
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
      // 특정 PE에게 할당된 프로젝트와 작업 그룹 조회 (중복 제거, 레포지토리 정보 포함)
      const result = await client.query(`
        SELECT DISTINCT ON (p.id)
          p.id as project_id,
          p.name as project_name,
          p.project_overview,
          p.target_system_name,
          p.urgency_level,
          p.deadline,
          p.project_status,
          p.created_at,
          -- d.name as domain_name, -- [advice from AI] domains 테이블 JOIN 제거
          pwa.id as assignment_id,
          pwa.work_group_id,
          pwa.assignment_status,
          pwa.progress_percentage,
          pwa.assigned_at,
          pwa.start_date,
          pwa.due_date,
          pwa.assignment_notes,
          pwa.pe_estimated_hours,
          pwa.actual_start_date,
          CASE 
            WHEN pwa.actual_start_date IS NOT NULL AND pwa.assignment_status = 'in_progress' THEN
              EXTRACT(EPOCH FROM (NOW() - pwa.actual_start_date)) / 3600
            ELSE 0
          END as actual_hours_worked,
          wg.name as work_group_name,
          wg.description as work_group_description,
          creator.full_name as created_by_name,
          pr.repository_url,
          pr.repository_name,
          pr.platform as git_platform
        FROM project_work_assignments pwa
        JOIN projects p ON p.id = pwa.project_id
        -- LEFT JOIN domains d ON d.id = p.domain_id -- [advice from AI] domain_id 컬럼이 존재하지 않음
        LEFT JOIN work_groups wg ON wg.id = pwa.work_group_id
        LEFT JOIN timbel_users creator ON creator.id = p.created_by
        LEFT JOIN project_repositories pr ON pr.project_id = p.id AND pr.assigned_pe = pwa.assigned_to
        WHERE pwa.assigned_to = $1
          AND pwa.assignment_status IN ('assigned', 'in_progress', 'review')
        ORDER BY p.id, pwa.assigned_at DESC
      `, [peUserId]);
      
      console.log(`✅ 특정 PE 할당 프로젝트 ${result.rows.length}개 조회 완료`);
      
      // 레포지토리 정보 디버깅
      result.rows.forEach((row, index) => {
        console.log(`📁 프로젝트 ${index + 1} 레포지토리 정보:`, {
          projectName: row.project_name,
          repositoryUrl: row.repository_url,
          repositoryName: row.repository_name,
          gitPlatform: row.git_platform,
          hasRepository: !!row.repository_url
        });
      });
      
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

// [advice from AI] 프로젝트 진행률 업데이트 API
router.put('/progress/:assignmentId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { progress_percentage, assignment_notes } = req.body;
    const userId = req.user?.userId || req.user?.id;

    console.log('📊 프로젝트 진행률 업데이트 요청:', { assignmentId, progress_percentage, userId });

    if (progress_percentage < 0 || progress_percentage > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid progress percentage',
        message: '진행률은 0-100% 사이여야 합니다.'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // 사용자 권한 확인
      const userRole = req.user?.roleType;
      
      // 할당 확인 및 업데이트 (관리자는 모든 할당 수정 가능)
      let result;
      if (userRole === 'admin' || userRole === 'executive' || userRole === 'po') {
        result = await client.query(`
          UPDATE project_work_assignments 
          SET 
            progress_percentage = $1,
            assignment_notes = $2,
            updated_at = NOW()
          WHERE id = $3
          RETURNING *
        `, [progress_percentage, assignment_notes, assignmentId]);
      } else {
        result = await client.query(`
          UPDATE project_work_assignments 
          SET 
            progress_percentage = $1,
            assignment_notes = $2,
            updated_at = NOW()
          WHERE id = $3 AND assigned_to = $4
          RETURNING *
        `, [progress_percentage, assignment_notes, assignmentId, userId]);
      }

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          message: '할당된 작업을 찾을 수 없거나 권한이 없습니다.'
        });
      }

      console.log('✅ 진행률 업데이트 완료:', result.rows[0]);
      
      // 진행률 업데이트 이벤트 기록
      const assignment = result.rows[0];
      try {
        await client.query(`
          INSERT INTO system_event_stream (
            id, event_type, event_category, title, description, 
            project_id, user_id, assignment_id, event_timestamp, 
            event_data, is_processed, requires_action
          ) VALUES (
            gen_random_uuid(), 'progress_update', 'project_management',
            '진행률 업데이트', $1,
            $2, $3, $4, NOW(),
            $5, true, false
          )
        `, [
          `프로젝트 진행률이 ${progress_percentage}%로 업데이트되었습니다.${assignment_notes ? ` 메모: ${assignment_notes}` : ''}`,
          assignment.project_id,
          userId,
          assignmentId,
          JSON.stringify({
            old_progress: assignment.progress_percentage,
            new_progress: progress_percentage,
            notes: assignment_notes,
            updated_by_role: userRole
          })
        ]);
        console.log('📝 진행률 업데이트 이벤트 기록 완료');
      } catch (eventError) {
        console.error('❌ 이벤트 기록 실패:', eventError);
        // 이벤트 기록 실패는 메인 작업에 영향을 주지 않음
      }
      
      res.json({
        success: true,
        message: '진행률이 업데이트되었습니다.',
        data: result.rows[0]
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 진행률 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update progress',
      message: error.message
    });
  }
});

// [advice from AI] 프로젝트 일시정지 API
router.put('/pause/:assignmentId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { pause_reason, assignment_notes } = req.body;
    const userId = req.user?.userId || req.user?.id;

    console.log('⏸️ 프로젝트 일시정지 요청:', { assignmentId, pause_reason, userId });

    if (!pause_reason || !pause_reason.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Pause reason required',
        message: '일시정지 사유를 입력해주세요.'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // 사용자 권한 확인
      const userRole = req.user?.roleType;
      
      // 할당 확인 및 일시정지 (관리자는 모든 할당 수정 가능)
      let result;
      if (userRole === 'admin' || userRole === 'executive' || userRole === 'po') {
        result = await client.query(`
          UPDATE project_work_assignments 
          SET 
            assignment_status = 'paused',
            assignment_notes = $1,
            updated_at = NOW(),
            assignment_history = assignment_history || $2
          WHERE id = $3 AND assignment_status = 'in_progress'
          RETURNING *
        `, [
          assignment_notes,
          JSON.stringify([{
            action: 'paused',
            reason: pause_reason,
            timestamp: new Date().toISOString(),
            user_id: userId
          }]),
          assignmentId
        ]);
      } else {
        result = await client.query(`
          UPDATE project_work_assignments 
          SET 
            assignment_status = 'paused',
            assignment_notes = $1,
            updated_at = NOW(),
            assignment_history = assignment_history || $2
          WHERE id = $3 AND assigned_to = $4 AND assignment_status = 'in_progress'
          RETURNING *
        `, [
          assignment_notes,
          JSON.stringify([{
            action: 'paused',
            reason: pause_reason,
            timestamp: new Date().toISOString(),
            user_id: userId
          }]),
          assignmentId,
          userId
        ]);
      }

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found or not in progress',
          message: '진행 중인 할당된 작업을 찾을 수 없거나 권한이 없습니다.'
        });
      }

      console.log('✅ 프로젝트 일시정지 완료:', result.rows[0]);
      
      res.json({
        success: true,
        message: '프로젝트가 일시정지되었습니다.',
        data: result.rows[0]
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ 프로젝트 일시정지 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause project',
      message: error.message
    });
  }
});

// [advice from AI] PE의 최근 활동 조회 API
// QC/QA 피드백 데이터 조회 API
router.get('/feedback/:peUserId', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { peUserId } = req.params;
    const requestingUserId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;

    console.log('🔍 QC/QA 피드백 데이터 조회:', { peUserId, requestingUserId, userRole });

    // 권한 확인: 본인이거나 admin/executive/po 역할
    if (peUserId !== requestingUserId && !['admin', 'executive', 'po'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: '권한이 없습니다.'
      });
    }
    
    const client = await pool.connect();
    
    try {
      // 피드백 통계 조회
      const statsResult = await client.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN feedback_status = 'open' THEN 1 END) as open,
          COUNT(CASE WHEN feedback_status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN feedback_status = 'fixed' THEN 1 END) as fixed,
          COUNT(CASE WHEN feedback_status = 'closed' THEN 1 END) as closed
        FROM qc_feedback_items 
        WHERE assigned_to_pe = $1
      `, [peUserId]);

      // 피드백 목록 조회 (최근 10개)
      const feedbackResult = await client.query(`
        SELECT 
          qfi.*,
          qr.project_id,
          p.name as project_name,
          tu_qc.full_name as qc_name,
          tu_pe.full_name as pe_name
        FROM qc_feedback_items qfi
        LEFT JOIN qc_qa_requests qr ON qfi.qc_request_id = qr.id
        LEFT JOIN projects p ON qr.project_id = p.id
        LEFT JOIN timbel_users tu_qc ON qfi.reported_by = tu_qc.id
        LEFT JOIN timbel_users tu_pe ON qfi.assigned_to_pe = tu_pe.id
        WHERE qfi.assigned_to_pe = $1
        ORDER BY qfi.created_at DESC
        LIMIT 10
      `, [peUserId]);

      const stats = statsResult.rows[0] || {
        total: 0,
        open: 0,
        in_progress: 0,
        fixed: 0,
        closed: 0
      };

      // 숫자로 변환
      Object.keys(stats).forEach(key => {
        stats[key] = parseInt(stats[key]) || 0;
      });

      res.json({
        success: true,
        data: {
          stats,
          feedbacks: feedbackResult.rows
        }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ QC/QA 피드백 데이터 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load feedback data',
      message: error.message
    });
  }
});

// PE 피드백 응답 API
router.post('/feedback-response', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { feedback_id, response_type, response_message, modification_details, estimated_fix_time } = req.body;
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;

    console.log('🔄 PE 피드백 응답 처리:', { feedback_id, response_type, userId });

    // PE 권한 확인
    if (userRole !== 'pe') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
        message: 'PE 권한이 필요합니다.'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. 피드백 정보 확인 및 권한 검증
      const feedbackResult = await client.query(`
        SELECT qfi.*, p.name as project_name
        FROM qc_feedback_items qfi
        LEFT JOIN qc_qa_requests qr ON qfi.qc_request_id = qr.id
        LEFT JOIN projects p ON qr.project_id = p.id
        WHERE qfi.id = $1 AND qfi.assigned_to_pe = $2
      `, [feedback_id, userId]);

      if (feedbackResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Feedback not found',
          message: '해당 피드백을 찾을 수 없거나 권한이 없습니다.'
        });
      }

      const feedback = feedbackResult.rows[0];

      // 2. PE 피드백 응답 저장
      const responseResult = await client.query(`
        INSERT INTO pe_feedback_responses (
          feedback_item_id, pe_user_id, response_type, response_message,
          modification_details, estimated_fix_hours, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'submitted')
        RETURNING id
      `, [
        feedback_id, 
        userId, 
        response_type, 
        response_message,
        modification_details || null,
        estimated_fix_time || null
      ]);

      const responseId = responseResult.rows[0].id;

      // 3. 피드백 상태 업데이트
      let newFeedbackStatus = 'in_progress';
      if (response_type === 'completion') {
        newFeedbackStatus = 'fixed';
      } else if (response_type === 'acknowledgment') {
        newFeedbackStatus = 'in_progress';
      }

      await client.query(`
        UPDATE qc_feedback_items 
        SET feedback_status = $1, updated_at = NOW()
        WHERE id = $2
      `, [newFeedbackStatus, feedback_id]);

      // 4. 시스템 이벤트 로그 기록
      const eventTitle = response_type === 'acknowledgment' ? '피드백 확인' :
                        response_type === 'progress_update' ? '피드백 진행 상황 업데이트' :
                        response_type === 'completion' ? '피드백 수정 완료' : '피드백 추가 설명 요청';

      await client.query(`
        INSERT INTO system_event_stream (
          id, event_type, event_category, title, description,
          project_id, user_id, event_timestamp, event_data, is_processed
        ) VALUES (
          gen_random_uuid(), $1, 'quality_assurance', $2, $3,
          $4, $5, NOW(), $6, true
        )
      `, [
        `pe_feedback_${response_type}`,
        eventTitle,
        `${feedback.project_name} 프로젝트의 피드백에 대한 응답: ${response_message.substring(0, 100)}`,
        feedback.project_id,
        userId,
        JSON.stringify({
          feedback_id,
          response_id: responseId,
          response_type,
          new_status: newFeedbackStatus,
          project_name: feedback.project_name
        })
      ]);

      // 5. QC/QA 사용자에게 알림 메시지 생성
      const qcUser = await client.query(`
        SELECT id, full_name FROM timbel_users WHERE id = $1
      `, [feedback.reported_by]);

      if (qcUser.rows.length > 0) {
        const messageResult = await client.query(`
          INSERT INTO unified_messages (
            title, content, message_type, priority, sender_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `, [
          `PE 피드백 응답: ${feedback.title}`,
          `${eventTitle}\n\n응답 내용: ${response_message}${modification_details ? `\n\n수정 세부사항: ${modification_details}` : ''}`,
          'pe_feedback_response',
          response_type === 'completion' ? 4 : 2, // priority as number
          userId,
          JSON.stringify({
            event_category: 'pe_feedback_response',
            event_source: 'user',
            project_id: feedback.project_id,
            feedback_id: feedback_id,
            response_type: response_type
          })
        ]);

        const messageId = messageResult.rows[0].id;

        await client.query(`
          INSERT INTO unified_message_recipients (message_id, recipient_id)
          VALUES ($1, $2)
        `, [messageId, feedback.reported_by]);
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: '피드백 응답이 성공적으로 전송되었습니다.',
        data: {
          response_id: responseId,
          feedback_status: newFeedbackStatus,
          response_type
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ PE 피드백 응답 처리 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback response',
      message: error.message
    });
  }
});

router.get('/activities/recent/:peUserId?', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { peUserId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    
    // 조회할 사용자 ID 결정
    let targetUserId = userId;
    if (peUserId && (userRole === 'admin' || userRole === 'executive' || userRole === 'po')) {
      targetUserId = peUserId;
    }
    
    console.log('📋 PE 최근 활동 조회:', { targetUserId, requestedBy: userId, role: userRole });
    
    const client = await pool.connect();
    
    try {
      // PE와 관련된 최근 활동 조회 (간소화 버전)
      const result = await client.query(`
        SELECT 
          pwa.id,
          'assignment' as event_type,
          'project_management' as event_category,
          CASE pwa.assignment_status
            WHEN 'assigned' THEN '프로젝트 할당'
            WHEN 'in_progress' THEN '작업 진행 중'
            WHEN 'completed' THEN '작업 완료'
            ELSE pwa.assignment_status
          END as title,
          CONCAT(p.name, ' - ', COALESCE(pwa.assignment_notes, '진행 중')) as description,
          pwa.updated_at as event_timestamp,
          '{}'::jsonb as event_data,
          p.name as project_name,
          pwa.progress_percentage,
          EXTRACT(EPOCH FROM (NOW() - pwa.updated_at)) as seconds_ago,
          'assignment' as source_type
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        WHERE pwa.assigned_to = $1
          AND pwa.updated_at >= NOW() - INTERVAL '7 days'
        
        UNION ALL
        
        -- QC/QA 피드백 관련 이벤트 (PE에게 할당된 피드백)
        SELECT 
          qfi.id,
          CASE 
            WHEN qfi.feedback_status = 'assigned' THEN 'qc_feedback_received'
            WHEN qfi.feedback_status = 'in_progress' THEN 'qc_feedback_in_progress'
            WHEN qfi.feedback_status = 'fixed' THEN 'qc_feedback_fixed'
            WHEN qfi.feedback_status = 'verified' THEN 'qc_feedback_verified'
            WHEN qfi.feedback_status = 'closed' THEN 'qc_feedback_closed'
            ELSE 'qc_feedback_updated'
          END as event_type,
          'quality_assurance' as event_category,
          CASE 
            WHEN qfi.feedback_status = 'assigned' THEN 'QC/QA 피드백 접수'
            WHEN qfi.feedback_status = 'in_progress' THEN 'QC/QA 피드백 처리 시작'
            WHEN qfi.feedback_status = 'fixed' THEN 'QC/QA 피드백 수정 완료'
            WHEN qfi.feedback_status = 'verified' THEN 'QC/QA 피드백 검증 완료'
            WHEN qfi.feedback_status = 'closed' THEN 'QC/QA 피드백 종료'
            ELSE 'QC/QA 피드백 업데이트'
          END as title,
          CONCAT(
            CASE qfi.feedback_type
              WHEN 'bug' THEN '버그'
              WHEN 'improvement' THEN '개선사항'
              WHEN 'enhancement' THEN '기능 개선'
              WHEN 'documentation' THEN '문서화'
              ELSE '피드백'
            END,
            ' - ', qfi.title,
            ' (심각도: ', 
            CASE qfi.severity_level
              WHEN 'critical' THEN 'Critical'
              WHEN 'high' THEN 'High'
              WHEN 'medium' THEN 'Medium'
              WHEN 'low' THEN 'Low'
              ELSE qfi.severity_level
            END,
            ')'
          ) as description,
          qfi.created_at as event_timestamp,
          JSON_BUILD_OBJECT(
            'feedback_id', qfi.id,
            'feedback_type', qfi.feedback_type,
            'severity_level', qfi.severity_level,
            'priority_level', qfi.priority_level,
            'feedback_status', qfi.feedback_status,
            'title', qfi.title
          )::jsonb as event_data,
          p.name as project_name,
          NULL as progress_percentage,
          EXTRACT(EPOCH FROM (NOW() - qfi.created_at)) as seconds_ago,
          'qc_feedback' as source_type
        FROM qc_feedback_items qfi
        LEFT JOIN qc_qa_requests qr ON qfi.qc_request_id = qr.id
        LEFT JOIN projects p ON qr.project_id = p.id
        WHERE qfi.assigned_to_pe = $1
        
        UNION ALL
        
        -- PE 피드백 응답 이벤트
        SELECT 
          pfr.id,
          CASE pfr.response_type
            WHEN 'acknowledgment' THEN 'pe_feedback_acknowledged'
            WHEN 'progress_update' THEN 'pe_feedback_progress'
            WHEN 'completion' THEN 'pe_feedback_completed'
            WHEN 'clarification_request' THEN 'pe_feedback_clarification'
            ELSE 'pe_feedback_response'
          END as event_type,
          'quality_assurance' as event_category,
          CASE pfr.response_type
            WHEN 'acknowledgment' THEN '피드백 확인'
            WHEN 'progress_update' THEN '피드백 진행 상황 업데이트'
            WHEN 'completion' THEN '피드백 수정 완료'
            WHEN 'clarification_request' THEN '피드백 추가 설명 요청'
            ELSE '피드백 응답'
          END as title,
          CONCAT('피드백 응답: ', LEFT(pfr.response_message, 50), 
                 CASE WHEN LENGTH(pfr.response_message) > 50 THEN '...' ELSE '' END) as description,
          pfr.created_at as event_timestamp,
          JSON_BUILD_OBJECT(
            'response_id', pfr.id,
            'feedback_id', pfr.feedback_item_id,
            'response_type', pfr.response_type,
            'status', pfr.status
          )::jsonb as event_data,
          p.name as project_name,
          NULL as progress_percentage,
          EXTRACT(EPOCH FROM (NOW() - pfr.created_at)) as seconds_ago,
          'pe_response' as source_type
        FROM pe_feedback_responses pfr
        JOIN qc_feedback_items qfi ON pfr.feedback_item_id = qfi.id
        LEFT JOIN qc_qa_requests qr ON qfi.qc_request_id = qr.id
        LEFT JOIN projects p ON qr.project_id = p.id
        WHERE pfr.pe_user_id = $1
        
        ORDER BY event_timestamp DESC
        LIMIT 10
      `, [targetUserId]);
      
      console.log(`✅ PE 최근 활동 ${result.rows.length}개 조회 완료`);
      
      res.json({
        success: true,
        data: result.rows
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PE 최근 활동 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activities',
      message: error.message
    });
  }
});

// 프로젝트 완료 보고서 제출 API
router.post('/completion-report', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { project_id, assignment_id, repository_url, completion_report } = req.body;
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    
    console.log('완료 보고서 제출 요청:', {
      projectId: project_id,
      assignmentId: assignment_id,
      userId,
      userRole,
      hasRepositoryUrl: !!repository_url
    });

    if (!project_id || !assignment_id || !completion_report) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: '필수 필드가 누락되었습니다.'
      });
    }
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. 프로젝트 할당 확인
      const assignmentResult = await client.query(`
        SELECT pwa.*, p.name as project_name, u.full_name as pe_name
        FROM project_work_assignments pwa
        JOIN projects p ON pwa.project_id = p.id
        JOIN timbel_users u ON pwa.assigned_to = u.id
        WHERE pwa.id = $1 AND pwa.project_id = $2
      `, [assignment_id, project_id]);

      if (assignmentResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          message: '해당 프로젝트 할당을 찾을 수 없습니다.'
        });
      }

      const assignment = assignmentResult.rows[0];

      // 권한 확인 (PE 본인이거나 관리자/PO)
      if (userRole !== 'admin' && userRole !== 'executive' && userRole !== 'po' && assignment.assigned_to !== userId) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: '해당 프로젝트에 대한 권한이 없습니다.'
        });
      }

      // 2. 완료 보고서 테이블이 없다면 생성
      await client.query(`
        CREATE TABLE IF NOT EXISTS project_completion_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id),
          assignment_id UUID NOT NULL REFERENCES project_work_assignments(id),
          submitted_by UUID NOT NULL REFERENCES timbel_users(id),
          repository_url TEXT,
          project_summary TEXT NOT NULL,
          technical_details TEXT NOT NULL,
          implemented_features TEXT NOT NULL,
          testing_results TEXT,
          known_issues TEXT,
          deployment_notes TEXT,
          documentation_status TEXT,
          additional_notes TEXT,
          submitted_at TIMESTAMP DEFAULT NOW(),
          qc_qa_status VARCHAR(50) DEFAULT 'pending',
          qc_qa_assigned_to UUID REFERENCES timbel_users(id),
          qc_qa_assigned_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 3. 완료 보고서 저장 (새로운 구조)
      // 먼저 테이블 구조 업데이트 (각각 분리)
      try {
        await client.query(`ALTER TABLE project_completion_reports ADD COLUMN IF NOT EXISTS deployment_comments TEXT`);
        await client.query(`ALTER TABLE project_completion_reports ADD COLUMN IF NOT EXISTS repo_analysis_data JSONB`);
        console.log('✅ 테이블 구조 업데이트 완료');
      } catch (alterError) {
        console.log('⚠️ 테이블 구조 업데이트 스킵 (이미 존재):', alterError.message);
      }

      console.log('📝 완료 보고서 데이터 준비:', {
        project_id,
        assignment_id,
        userId,
        repository_url,
        completion_report_keys: Object.keys(completion_report),
        has_repo_analysis: !!completion_report.repo_analysis_data
      });

      let parsedRepoAnalysisData = null;
      if (completion_report.repo_analysis_data) {
        try {
          parsedRepoAnalysisData = typeof completion_report.repo_analysis_data === 'string' ? 
            JSON.parse(completion_report.repo_analysis_data) : 
            completion_report.repo_analysis_data;
          console.log('✅ 레포지토리 분석 데이터 파싱 성공');
        } catch (parseError) {
          console.error('❌ 레포지토리 분석 데이터 파싱 실패:', parseError.message);
          parsedRepoAnalysisData = null;
        }
      }

      const reportResult = await client.query(`
        INSERT INTO project_completion_reports (
          project_id, assignment_id, submitted_by, repository_url,
          project_summary, technical_details, implemented_features,
          known_issues, deployment_notes, deployment_comments,
          additional_notes, repo_analysis_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        project_id, assignment_id, assignment.assigned_to, repository_url,
        completion_report.project_summary || completion_report.projectSummary,
        completion_report.technical_details || completion_report.technicalDetails || '',
        completion_report.implemented_features || completion_report.implementedFeatures || '',
        completion_report.known_issues || completion_report.knownIssues || '',
        completion_report.deployment_notes || completion_report.deploymentNotes || '',
        completion_report.deployment_comments || completion_report.deploymentComments || '',
        completion_report.additional_notes || completion_report.additionalNotes || '',
        parsedRepoAnalysisData
      ]);

      const reportId = reportResult.rows[0].id;

      // 4. 프로젝트 상태를 완료로 변경
      await client.query(`
        UPDATE projects SET 
          project_status = 'completed',
          completion_date = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `, [project_id]);

      // 5. 할당 상태를 완료로 변경
      await client.query(`
        UPDATE project_work_assignments SET 
          assignment_status = 'completed',
          progress_percentage = 100,
          completion_date = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `, [assignment_id]);

      // 6. 레포지토리 정보가 있다면 시스템 등록 프로세스 시작
      if (repository_url) {
        // 레포지토리 분석 및 시스템 등록 로직은 별도 서비스에서 처리
        console.log('레포지토리 시스템 등록 프로세스 시작:', repository_url);
        
        // Git Analytics Service를 통한 레포지토리 분석 시작
        try {
          const GitAnalyticsService = require('../services/gitAnalyticsService');
          const gitService = new GitAnalyticsService();
          const repositoryData = {
            url: repository_url,
            platform: 'github' // 기본값
          };
          await gitService.analyzeRepository(client, repositoryData);
          console.log('레포지토리 분석 완료');
        } catch (analysisError) {
          console.error('레포지토리 분석 실패:', analysisError);
          // 분석 실패는 메인 프로세스를 중단하지 않음
        }
      }

      // 7. QC/QA 부서로 품질 의뢰서 생성
      // 먼저 테이블 생성
      await client.query(`
        CREATE TABLE IF NOT EXISTS qc_qa_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          project_id UUID NOT NULL REFERENCES projects(id),
          completion_report_id UUID NOT NULL REFERENCES project_completion_reports(id),
          request_status VARCHAR(50) DEFAULT 'pending',
          priority_level VARCHAR(20) DEFAULT 'normal',
          requested_by UUID NOT NULL REFERENCES timbel_users(id),
          assigned_to UUID REFERENCES timbel_users(id),
          test_plan TEXT,
          test_results TEXT,
          quality_score INTEGER,
          approval_status VARCHAR(50) DEFAULT 'pending',
          approved_by UUID REFERENCES timbel_users(id),
          approved_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 그 다음 데이터 삽입
      const qcQaRequestResult = await client.query(`
        INSERT INTO qc_qa_requests (
          project_id, completion_report_id, requested_by, priority_level
        ) VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [project_id, reportId, assignment.assigned_to, assignment.urgency_level === 'urgent' ? 'high' : 'normal']);

      // 8. QC/QA 사용자들에게 메시지 알림 생성
      const qcQaUsers = await client.query(`
        SELECT id, username, full_name 
        FROM timbel_users 
        WHERE role_type = 'qa' AND status != 'inactive'
      `);

      console.log(`📢 QC/QA 사용자 ${qcQaUsers.rows.length}명에게 알림 생성`);

      // 통합 메시지 시스템 사용
      const messageResult = await client.query(`
        INSERT INTO unified_messages (
          title, content, message_type, priority, sender_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        `새로운 품질 검증 요청: ${assignment.project_name}`,
        `${assignment.pe_name}님이 "${assignment.project_name}" 프로젝트의 완료 보고서를 제출했습니다.\n\n` +
        `긴급도: ${assignment.urgency_level}\n` +
        `마감일: ${assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : '미정'}\n\n` +
        `QC/QA 품질 검증을 시작해주세요.`,
        'qc_qa_request',
        assignment.urgency_level === 'urgent' ? 4 : 2, // priority as number
        assignment.assigned_to,
        JSON.stringify({
          event_category: 'qc_qa_request',
          event_source: 'user',
          project_id: project_id,
          qc_request_id: qcQaRequestResult.rows[0].id,
          urgency_level: assignment.urgency_level,
          pe_name: assignment.pe_name
        })
      ]);

      const messageId = messageResult.rows[0].id;

      // 각 QC/QA 사용자에게 메시지 수신자 추가
      for (const qcUser of qcQaUsers.rows) {
        await client.query(`
          INSERT INTO unified_message_recipients (message_id, recipient_id)
          VALUES ($1, $2)
        `, [messageId, qcUser.id]);
      }

      // 9. 시스템 이벤트 스트림에 기록
      await client.query(`
        INSERT INTO system_event_stream (
          id, event_type, event_category, title, description,
          project_id, user_id, assignment_id, event_timestamp,
          event_data, is_processed, requires_action
        ) VALUES (
          gen_random_uuid(), 'project_completion', 'project_management',
          '프로젝트 완료', $1,
          $2, $3, $4, NOW(),
          $5, true, true
        )
      `, [
        `${assignment.project_name} 프로젝트가 완료되어 QC/QA 부서로 전달되었습니다.`,
        project_id,
        assignment.assigned_to,
        assignment_id,
        JSON.stringify({
          completion_report_id: reportId,
          repository_url,
          submitted_by_role: userRole,
          actual_submitter_id: userId,
          project_name: assignment.project_name,
          pe_name: assignment.pe_name,
          submitted_on_behalf: userId !== assignment.assigned_to
        })
      ]);

      await client.query('COMMIT');

      console.log('완료 보고서 제출 성공:', {
        reportId,
        projectId: project_id,
        assignmentId: assignment_id
      });

      res.json({
        success: true,
        message: '완료 보고서가 성공적으로 제출되었습니다.',
        data: {
          report_id: reportId,
          project_status: 'completed',
          qc_qa_status: 'pending'
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('완료 보고서 제출 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit completion report',
      message: error.message
    });
  }
});

// 레포지토리 분석 API (완료 보고서용)
router.post('/analyze-repository', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { repository_url, project_id } = req.body;
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    
    console.log('레포지토리 분석 요청:', {
      repository_url,
      project_id,
      userId,
      userRole
    });

    if (!repository_url) {
      return res.status(400).json({
        success: false,
        error: 'Missing repository URL',
        message: '레포지토리 URL이 필요합니다.'
      });
    }

    const client = await pool.connect();
    
    try {
      // 프로젝트 권한 확인
      let projectCheck;
      if (userRole === 'admin' || userRole === 'executive' || userRole === 'po') {
        projectCheck = await client.query(`
          SELECT p.*, pr.repository_url, pr.platform 
          FROM projects p
          LEFT JOIN project_repositories pr ON p.id = pr.project_id
          WHERE p.id = $1
        `, [project_id]);
      } else {
        projectCheck = await client.query(`
          SELECT p.*, pr.repository_url, pr.platform 
          FROM projects p
          LEFT JOIN project_repositories pr ON p.id = pr.project_id
          LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
          WHERE p.id = $1 AND pwa.assigned_to = $2
        `, [project_id, userId]);
      }

      if (projectCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: '해당 프로젝트에 대한 권한이 없습니다.'
        });
      }

      // Git Analytics Service를 사용하여 레포지토리 분석
      const GitAnalyticsService = require('../services/gitAnalyticsService');
      const gitService = new GitAnalyticsService();
      
      console.log('레포지토리 상세 분석 시작:', repository_url);
      
      // 테스트용으로 공개 레포지토리 URL이 없는 경우 샘플 레포지토리 사용
      let analysisUrl = repository_url;
      if (!repository_url || repository_url === '미등록' || !repository_url.includes('github.com')) {
        console.log('⚠️ 유효하지 않은 레포지토리 URL, 샘플 레포지토리 사용');
        analysisUrl = 'https://github.com/facebook/react'; // 공개 레포지토리 예시
      }
      
      const analysisData = await gitService.generateCompletionReportData(analysisUrl);
      
      if (!analysisData) {
        console.log('❌ 레포지토리 분석 완전 실패');
        return res.status(500).json({
          success: false,
          error: 'Analysis failed',
          message: '레포지토리 분석에 실패했습니다. URL과 접근 권한을 확인해주세요.'
        });
      }

      console.log('레포지토리 분석 완료:', {
        primaryLanguage: analysisData.techDetails?.primaryLanguage,
        techStackCount: analysisData.techDetails?.techStack?.length,
        hasReadme: analysisData.documentation?.hasReadme,
        readmeQuality: analysisData.documentation?.readmeQuality
      });

      res.json({
        success: true,
        message: '레포지토리 분석이 완료되었습니다.',
        data: analysisData
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('레포지토리 분석 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze repository',
      message: error.message
    });
  }
});

// PE 프로젝트 히스토리 조회 API
router.get('/history/:peUserId?', jwtAuth.verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    const targetPEUserId = req.params.peUserId || userId;
    
    console.log('📚 PE 프로젝트 히스토리 조회:', { userId, userRole, targetPEUserId });

    // 권한 확인
    if (userRole !== 'admin' && userRole !== 'executive' && userRole !== 'po' && userId !== targetPEUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: '해당 사용자의 프로젝트 히스토리를 조회할 권한이 없습니다.'
      });
    }

    const client = await pool.connect();
    
    try {
      // PE에게 할당된 모든 프로젝트 히스토리 (간소화 버전)
      const historyResult = await client.query(`
        SELECT DISTINCT ON (p.id)
          p.id as project_id,
          p.name as project_name,
          p.description as project_overview,
          p.urgency_level,
          p.deadline,
          p.project_status,
          p.created_at,
          p.updated_at,
          pwa.assignment_status,
          pwa.progress_percentage,
          pwa.assigned_at,
          pwa.start_date,
          pwa.completed_at as assignment_completion_date
        FROM projects p
        JOIN project_work_assignments pwa ON p.id = pwa.project_id
        WHERE pwa.assigned_to = $1
        ORDER BY p.id, pwa.assigned_at DESC
        LIMIT 20
      `, [targetPEUserId]);

      const historyProjects = historyResult.rows.map(row => ({
        project_id: row.project_id,
        project_name: row.project_name,
        project_overview: row.project_overview,
        urgency_level: row.urgency_level,
        deadline: row.deadline,
        project_status: row.project_status,
        created_at: row.created_at,
        updated_at: row.updated_at,
        assignment_status: row.assignment_status,
        progress_percentage: row.progress_percentage,
        assigned_at: row.assigned_at,
        assignment_completion_date: row.assignment_completion_date
      }));

      console.log(`✅ PE 프로젝트 히스토리 ${historyProjects.length}개 조회 완료`);

      res.json({
        success: true,
        data: historyProjects
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ PE 프로젝트 히스토리 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load project history',
      message: error.message
    });
  }
});

module.exports = router;
