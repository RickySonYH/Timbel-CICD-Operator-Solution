// QC/QA 대시보드 API 라우터
// 품질 검증 및 테스트 관리 API

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

// 데이터베이스 연결 풀 설정
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'timbel_db',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// QC/QA 테스트 관리 테이블 초기화
async function initializeQCTables() {
  const client = await pool.connect();
  try {
    console.log('🔧 QC/QA 테스트 관리 테이블 초기화 시작...');

    // 0-1. 프로젝트 완료 보고서 테이블 (먼저 생성)
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_completion_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id),
        assignment_id UUID REFERENCES project_work_assignments(id),
        submitted_by UUID NOT NULL REFERENCES timbel_users(id),
        repository_url VARCHAR(500),
        project_summary TEXT,
        technical_details TEXT,
        implemented_features TEXT,
        testing_results TEXT,
        known_issues TEXT,
        deployment_notes TEXT,
        deployment_comments TEXT,
        documentation_status TEXT,
        additional_notes TEXT,
        repo_analysis_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 0-2. QC/QA 요청 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_qa_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id),
        completion_report_id UUID REFERENCES project_completion_reports(id),
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

    // 1. 테스트 계획 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_test_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        qc_request_id UUID NOT NULL REFERENCES qc_qa_requests(id) ON DELETE CASCADE,
        created_by UUID NOT NULL REFERENCES timbel_users(id),
        test_plan_name VARCHAR(255) NOT NULL,
        test_description TEXT,
        estimated_hours INTEGER DEFAULT 0,
        test_environment TEXT,
        test_tools TEXT,
        standardized_test_sets JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 2. 테스트 카테고리 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_test_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_plan_id UUID NOT NULL REFERENCES qc_test_plans(id) ON DELETE CASCADE,
        category_name VARCHAR(100) NOT NULL,
        category_type VARCHAR(50) NOT NULL, -- 'functional', 'performance', 'security', 'usability', 'compatibility', 'custom'
        description TEXT,
        priority_level VARCHAR(20) DEFAULT 'normal', -- 'high', 'normal', 'low'
        is_required BOOLEAN DEFAULT true,
        estimated_hours INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 3. 개별 테스트 항목 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_test_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_category_id UUID NOT NULL REFERENCES qc_test_categories(id) ON DELETE CASCADE,
        test_plan_id UUID NOT NULL REFERENCES qc_test_plans(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        item_description TEXT,
        test_procedure TEXT,
        expected_result TEXT,
        acceptance_criteria TEXT,
        priority_level VARCHAR(20) DEFAULT 'normal',
        is_automated BOOLEAN DEFAULT false,
        estimated_minutes INTEGER DEFAULT 30,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 4. 테스트 실행 결과 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_test_executions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_item_id UUID NOT NULL REFERENCES qc_test_items(id) ON DELETE CASCADE,
        test_plan_id UUID NOT NULL REFERENCES qc_test_plans(id) ON DELETE CASCADE,
        executed_by UUID NOT NULL REFERENCES timbel_users(id),
        execution_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'passed', 'failed', 'blocked', 'skipped'
        actual_result TEXT,
        test_evidence TEXT, -- 스크린샷, 로그 파일 등의 경로
        defect_description TEXT,
        severity_level VARCHAR(20), -- 'critical', 'high', 'medium', 'low'
        execution_time_minutes INTEGER,
        executed_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 5. 결함 관리 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_defects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_execution_id UUID REFERENCES qc_test_executions(id) ON DELETE SET NULL,
        qc_request_id UUID NOT NULL REFERENCES qc_qa_requests(id) ON DELETE CASCADE,
        reported_by UUID NOT NULL REFERENCES timbel_users(id),
        assigned_to UUID REFERENCES timbel_users(id),
        defect_title VARCHAR(255) NOT NULL,
        defect_description TEXT NOT NULL,
        steps_to_reproduce TEXT,
        expected_behavior TEXT,
        actual_behavior TEXT,
        severity_level VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
        priority_level VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'
        defect_status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed', 'rejected'
        resolution_notes TEXT,
        test_environment TEXT,
        browser_os_info TEXT,
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        resolved_at TIMESTAMP
      )
    `);

    // 6. 테스트 메트릭스 및 리포트 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_test_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_plan_id UUID NOT NULL REFERENCES qc_test_plans(id) ON DELETE CASCADE,
        qc_request_id UUID NOT NULL REFERENCES qc_qa_requests(id) ON DELETE CASCADE,
        total_test_items INTEGER DEFAULT 0,
        executed_items INTEGER DEFAULT 0,
        passed_items INTEGER DEFAULT 0,
        failed_items INTEGER DEFAULT 0,
        blocked_items INTEGER DEFAULT 0,
        skipped_items INTEGER DEFAULT 0,
        total_defects INTEGER DEFAULT 0,
        critical_defects INTEGER DEFAULT 0,
        high_defects INTEGER DEFAULT 0,
        medium_defects INTEGER DEFAULT 0,
        low_defects INTEGER DEFAULT 0,
        test_coverage_percentage DECIMAL(5,2) DEFAULT 0.00,
        pass_rate_percentage DECIMAL(5,2) DEFAULT 0.00,
        total_execution_time_hours DECIMAL(8,2) DEFAULT 0.00,
        calculated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 7. 품질 평가 및 승인 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_quality_assessments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        qc_request_id UUID NOT NULL REFERENCES qc_qa_requests(id) ON DELETE CASCADE,
        test_plan_id UUID NOT NULL REFERENCES qc_test_plans(id) ON DELETE CASCADE,
        assessed_by UUID NOT NULL REFERENCES timbel_users(id),
        overall_quality_score INTEGER CHECK (overall_quality_score >= 0 AND overall_quality_score <= 100),
        functionality_score INTEGER CHECK (functionality_score >= 0 AND functionality_score <= 100),
        reliability_score INTEGER CHECK (reliability_score >= 0 AND reliability_score <= 100),
        usability_score INTEGER CHECK (usability_score >= 0 AND usability_score <= 100),
        efficiency_score INTEGER CHECK (efficiency_score >= 0 AND efficiency_score <= 100),
        maintainability_score INTEGER CHECK (maintainability_score >= 0 AND maintainability_score <= 100),
        portability_score INTEGER CHECK (portability_score >= 0 AND portability_score <= 100),
        security_score INTEGER CHECK (security_score >= 0 AND security_score <= 100),
        assessment_summary TEXT,
        recommendations TEXT,
        approval_decision VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'conditional'
        approval_conditions TEXT,
        assessed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 8. 인덱스 생성
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_test_plans_request_id ON qc_test_plans(qc_request_id);
      CREATE INDEX IF NOT EXISTS idx_qc_test_categories_plan_id ON qc_test_categories(test_plan_id);
      CREATE INDEX IF NOT EXISTS idx_qc_test_items_category_id ON qc_test_items(test_category_id);
      CREATE INDEX IF NOT EXISTS idx_qc_test_items_plan_id ON qc_test_items(test_plan_id);
      CREATE INDEX IF NOT EXISTS idx_qc_test_executions_item_id ON qc_test_executions(test_item_id);
      CREATE INDEX IF NOT EXISTS idx_qc_test_executions_plan_id ON qc_test_executions(test_plan_id);
      CREATE INDEX IF NOT EXISTS idx_qc_defects_request_id ON qc_defects(qc_request_id);
      CREATE INDEX IF NOT EXISTS idx_qc_defects_status ON qc_defects(defect_status);
      CREATE INDEX IF NOT EXISTS idx_qc_defects_severity ON qc_defects(severity_level);
      CREATE INDEX IF NOT EXISTS idx_qc_test_metrics_plan_id ON qc_test_metrics(test_plan_id);
      CREATE INDEX IF NOT EXISTS idx_qc_quality_assessments_request_id ON qc_quality_assessments(qc_request_id);
    `);

    // 9. QC/QA 피드백 및 이슈 관리 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_feedback_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        qc_request_id UUID NOT NULL REFERENCES qc_qa_requests(id) ON DELETE CASCADE,
        defect_id UUID REFERENCES qc_defects(id) ON DELETE SET NULL,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        reported_by UUID NOT NULL REFERENCES timbel_users(id),
        assigned_to_pe UUID REFERENCES timbel_users(id),
        original_pe UUID REFERENCES timbel_users(id), -- 원래 개발한 PE
        feedback_type VARCHAR(50) NOT NULL, -- 'bug', 'improvement', 'enhancement', 'documentation'
        severity_level VARCHAR(20) NOT NULL, -- 'critical', 'high', 'medium', 'low'
        priority_level VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        steps_to_reproduce TEXT,
        expected_behavior TEXT,
        actual_behavior TEXT,
        test_environment TEXT,
        browser_os_info TEXT,
        attachments JSONB DEFAULT '[]'::jsonb,
        feedback_status VARCHAR(50) DEFAULT 'open', -- 'open', 'assigned', 'in_progress', 'fixed', 'under_review', 'verified', 'closed', 'reopened'
        resolution_notes TEXT,
        qc_notes TEXT,
        estimated_fix_hours INTEGER,
        actual_fix_hours INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        assigned_at TIMESTAMP,
        resolved_at TIMESTAMP,
        verified_at TIMESTAMP
      )
    `);

    // 10. PE 피드백 응답 및 수정 기록 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS pe_feedback_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        feedback_item_id UUID NOT NULL REFERENCES qc_feedback_items(id) ON DELETE CASCADE,
        pe_user_id UUID NOT NULL REFERENCES timbel_users(id),
        response_type VARCHAR(50) NOT NULL, -- 'acknowledgment', 'clarification_request', 'progress_update', 'completion', 'rejection'
        response_message TEXT NOT NULL,
        modification_details TEXT,
        repository_commit_hash VARCHAR(255),
        branch_name VARCHAR(100),
        files_changed JSONB DEFAULT '[]'::jsonb,
        estimated_fix_time INTEGER, -- in hours
        actual_fix_time INTEGER, -- in hours
        status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'needs_clarification'
        attachments JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 11. 피드백 커뮤니케이션 로그 테이블
    await client.query(`
      CREATE TABLE IF NOT EXISTS qc_pe_communications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        feedback_item_id UUID NOT NULL REFERENCES qc_feedback_items(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES timbel_users(id),
        receiver_id UUID NOT NULL REFERENCES timbel_users(id),
        message_type VARCHAR(50) DEFAULT 'comment', -- 'comment', 'status_update', 'assignment', 'clarification'
        message TEXT NOT NULL,
        attachments JSONB DEFAULT '[]'::jsonb,
        is_internal BOOLEAN DEFAULT false, -- QC/QA 내부 메모인지 여부
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // 12. 추가 인덱스 생성
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_feedback_items_qc_request_id ON qc_feedback_items(qc_request_id);
      CREATE INDEX IF NOT EXISTS idx_qc_feedback_items_project_id ON qc_feedback_items(project_id);
      CREATE INDEX IF NOT EXISTS idx_qc_feedback_items_assigned_pe ON qc_feedback_items(assigned_to_pe);
      CREATE INDEX IF NOT EXISTS idx_qc_feedback_items_status ON qc_feedback_items(feedback_status);
      CREATE INDEX IF NOT EXISTS idx_qc_feedback_items_severity ON qc_feedback_items(severity_level);
      CREATE INDEX IF NOT EXISTS idx_pe_feedback_responses_feedback_id ON pe_feedback_responses(feedback_item_id);
      CREATE INDEX IF NOT EXISTS idx_pe_feedback_responses_pe_user ON pe_feedback_responses(pe_user_id);
      CREATE INDEX IF NOT EXISTS idx_qc_pe_communications_feedback_id ON qc_pe_communications(feedback_item_id);
    `);

    console.log('✅ QC/QA 테스트 관리 테이블 초기화 완료');
    console.log('✅ QC/QA 피드백 시스템 테이블 초기화 완료');

  } catch (error) {
    console.error('❌ QC/QA 테스트 테이블 초기화 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 서버 시작 시 테이블 초기화
initializeQCTables().catch(console.error);

// QC/QA 통계 조회 API
router.get('/stats', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    
    console.log('QC/QA 통계 조회 요청:', { userId, userRole });

    const client = await pool.connect();
    
    try {
      // QC/QA 요청 통계 조회
      const statsResult = await client.query(`
        SELECT 
          COUNT(*) as total_requests,
          COUNT(CASE WHEN request_status = 'pending' THEN 1 END) as pending_requests,
          COUNT(CASE WHEN request_status = 'in_progress' THEN 1 END) as in_progress_requests,
          COUNT(CASE WHEN request_status = 'completed' THEN 1 END) as completed_requests,
          COUNT(CASE WHEN request_status = 'rejected' THEN 1 END) as rejected_requests,
          ROUND(AVG(CASE WHEN quality_score IS NOT NULL THEN quality_score END), 1) as avg_quality_score
        FROM qc_qa_requests
      `);

      const stats = statsResult.rows[0];
      
      console.log('QC/QA 통계 조회 완료:', stats);

      res.json({
        success: true,
        data: {
          total_requests: parseInt(stats.total_requests) || 0,
          pending_requests: parseInt(stats.pending_requests) || 0,
          in_progress_requests: parseInt(stats.in_progress_requests) || 0,
          completed_requests: parseInt(stats.completed_requests) || 0,
          rejected_requests: parseInt(stats.rejected_requests) || 0,
          avg_quality_score: parseFloat(stats.avg_quality_score) || 0
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('QC/QA 통계 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch QC stats',
      message: error.message
    });
  }
});

// QC/QA 요청 목록 조회 API
router.get('/requests', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    
    console.log('QC/QA 요청 목록 조회:', { userId, userRole });

    const client = await pool.connect();
    
    try {
      const requestsResult = await client.query(`
        SELECT 
          qr.id,
          qr.project_id,
          qr.completion_report_id,
          qr.request_status,
          qr.priority_level,
          qr.requested_by,
          qr.assigned_to,
          qr.test_plan,
          qr.test_results,
          qr.quality_score,
          qr.approval_status,
          qr.approved_by,
          qr.approved_at,
          qr.created_at,
          qr.updated_at,
          p.name as project_name,
          requester.full_name as pe_name,
          assignee.full_name as assigned_to_name,
          approver.full_name as approved_by_name,
          pcr.repository_url,
          pcr.project_summary,
          pcr.technical_details,
          pcr.implemented_features
        FROM qc_qa_requests qr
        JOIN projects p ON qr.project_id = p.id
        JOIN project_completion_reports pcr ON qr.completion_report_id = pcr.id
        JOIN timbel_users requester ON qr.requested_by = requester.id
        LEFT JOIN timbel_users assignee ON qr.assigned_to = assignee.id
        LEFT JOIN timbel_users approver ON qr.approved_by = approver.id
        ORDER BY 
          CASE qr.priority_level 
            WHEN 'high' THEN 1 
            WHEN 'normal' THEN 2 
            WHEN 'low' THEN 3 
          END,
          qr.created_at DESC
      `);

      console.log(`QC/QA 요청 목록 조회 완료: ${requestsResult.rows.length}개`);

      res.json({
        success: true,
        data: requestsResult.rows
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('QC/QA 요청 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch QC requests',
      message: error.message
    });
  }
});

// QC/QA 작업 시작 API
router.post('/start-work/:requestId', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    
    console.log('🚀 QC/QA 작업 시작:', { requestId, userId, userRole });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. QC/QA 요청 확인 및 상태 체크
      const requestCheck = await client.query(`
        SELECT qr.*, p.project_name, pe_user.full_name as pe_name
        FROM qc_qa_requests qr
        JOIN projects p ON qr.project_id = p.id
        JOIN project_completion_reports pcr ON qr.completion_report_id = pcr.id
        JOIN timbel_users pe_user ON pcr.submitted_by = pe_user.id
        WHERE qr.id = $1
      `, [requestId]);

      if (requestCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Request not found',
          message: 'QC/QA 요청을 찾을 수 없습니다.'
        });
      }

      const request = requestCheck.rows[0];

      // 2. 이미 다른 사용자가 작업 중인지 확인
      if (request.assigned_to && request.assigned_to !== userId && request.request_status === 'in_progress') {
        const assignedUser = await client.query(`
          SELECT full_name FROM timbel_users WHERE id = $1
        `, [request.assigned_to]);

        return res.status(409).json({
          success: false,
          error: 'Already assigned',
          message: `이미 ${assignedUser.rows[0]?.full_name || '다른 사용자'}가 작업 중입니다.`
        });
      }

      // 3. 작업 시작 - 담당자 지정 및 상태 변경
      await client.query(`
        UPDATE qc_qa_requests 
        SET 
          assigned_to = $1,
          request_status = 'in_progress',
          updated_at = NOW()
        WHERE id = $2
      `, [userId, requestId]);

      // 4. 시스템 이벤트 기록
      await client.query(`
        INSERT INTO system_event_stream (
          id, event_type, event_category, title, description,
          project_id, user_id, event_timestamp, event_data, is_processed, requires_action
        ) VALUES (
          gen_random_uuid(), 'qc_qa_work_start', 'quality_assurance',
          'QC/QA 작업 시작', $1,
          $2, $3, NOW(), $4, true, false
        )
      `, [
        `${request.project_name} 프로젝트의 QC/QA 작업을 시작했습니다.`,
        request.project_id,
        userId,
        JSON.stringify({
          qc_qa_request_id: requestId,
          project_name: request.project_name,
          pe_name: request.pe_name
        })
      ]);

      await client.query('COMMIT');

      console.log('✅ QC/QA 작업 시작 완료:', { requestId, userId });

      res.json({
        success: true,
        message: 'QC/QA 작업이 시작되었습니다.',
        data: {
          request_id: requestId,
          assigned_to: userId,
          status: 'in_progress'
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ QC/QA 작업 시작 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start QC/QA work',
      message: error.message
    });
  }
});

// 테스트 계획 등록 API
router.post('/test-plan', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const { request_id, test_plan } = req.body;
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    
    console.log('테스트 계획 등록 요청:', {
      requestId: request_id,
      userId,
      userRole,
      testPlan: test_plan
    });

    if (!request_id || !test_plan) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: '필수 필드가 누락되었습니다.'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. QC/QA 요청 확인
      const requestResult = await client.query(`
        SELECT qr.*, p.name as project_name
        FROM qc_qa_requests qr
        JOIN projects p ON qr.project_id = p.id
        WHERE qr.id = $1
      `, [request_id]);

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Request not found',
          message: '해당 QC/QA 요청을 찾을 수 없습니다.'
        });
      }

      const request = requestResult.rows[0];

      // 2. 테스트 계획 업데이트 및 상태 변경
      await client.query(`
        UPDATE qc_qa_requests SET 
          test_plan = $1,
          request_status = 'in_progress',
          assigned_to = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [JSON.stringify(test_plan), userId, request_id]);

      // 3. QC/QA 작업 할당 테이블 생성 및 할당 기록
      await client.query(`
        CREATE TABLE IF NOT EXISTS qc_qa_assignments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          request_id UUID NOT NULL REFERENCES qc_qa_requests(id),
          assigned_to UUID NOT NULL REFERENCES timbel_users(id),
          assignment_status VARCHAR(50) DEFAULT 'assigned',
          progress_percentage INTEGER DEFAULT 0,
          estimated_hours INTEGER,
          actual_hours_worked DECIMAL(5,2) DEFAULT 0,
          assigned_at TIMESTAMP DEFAULT NOW(),
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      // 4. QC/QA 할당 기록 생성
      await client.query(`
        INSERT INTO qc_qa_assignments (
          request_id, assigned_to, estimated_hours, assignment_status, started_at
        ) VALUES ($1, $2, $3, 'in_progress', NOW())
      `, [request_id, userId, parseInt(test_plan.estimatedHours) || 40]);

      // 5. 시스템 이벤트 스트림에 기록
      await client.query(`
        INSERT INTO system_event_stream (
          id, event_type, event_category, title, description,
          project_id, user_id, event_timestamp,
          event_data, is_processed, requires_action
        ) VALUES (
          gen_random_uuid(), 'qc_test_plan_created', 'quality_assurance',
          'QC/QA 테스트 계획 등록', $1,
          $2, $3, NOW(),
          $4, true, false
        )
      `, [
        `${request.project_name} 프로젝트의 품질 검증 테스트 계획이 등록되었습니다.`,
        request.project_id,
        userId,
        JSON.stringify({
          request_id,
          test_plan,
          assigned_to: userId,
          project_name: request.project_name,
          estimated_hours: test_plan.estimatedHours
        })
      ]);

      await client.query('COMMIT');

      console.log('테스트 계획 등록 성공:', {
        requestId: request_id,
        assignedTo: userId
      });

      res.json({
        success: true,
        message: '테스트 계획이 성공적으로 등록되었습니다.',
        data: {
          request_id,
          status: 'in_progress',
          assigned_to: userId
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('테스트 계획 등록 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create test plan',
      message: error.message
    });
  }
});

// QC/QA 진행률 업데이트 API
router.put('/progress/:requestId', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { progress_percentage, test_results, quality_score, notes } = req.body;
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    
    console.log('QC/QA 진행률 업데이트 요청:', {
      requestId,
      progress_percentage,
      quality_score,
      userId,
      userRole
    });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. QC/QA 요청 및 할당 확인
      const requestResult = await client.query(`
        SELECT qr.*, qa.id as assignment_id, p.name as project_name
        FROM qc_qa_requests qr
        JOIN qc_qa_assignments qa ON qr.id = qa.request_id
        JOIN projects p ON qr.project_id = p.id
        WHERE qr.id = $1 AND qa.assigned_to = $2
      `, [requestId, userId]);

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Assignment not found',
          message: '해당 QC/QA 할당을 찾을 수 없습니다.'
        });
      }

      const request = requestResult.rows[0];

      // 2. 진행률 및 테스트 결과 업데이트
      await client.query(`
        UPDATE qc_qa_requests SET 
          test_results = COALESCE($1, test_results),
          quality_score = COALESCE($2, quality_score),
          updated_at = NOW()
        WHERE id = $3
      `, [test_results, quality_score, requestId]);

      // 3. 할당 진행률 업데이트
      await client.query(`
        UPDATE qc_qa_assignments SET 
          progress_percentage = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [progress_percentage, request.assignment_id]);

      // 4. 100% 완료 시 상태 변경
      if (progress_percentage >= 100) {
        await client.query(`
          UPDATE qc_qa_requests SET 
            request_status = 'completed',
            updated_at = NOW()
          WHERE id = $1
        `, [requestId]);

        await client.query(`
          UPDATE qc_qa_assignments SET 
            assignment_status = 'completed',
            completed_at = NOW()
          WHERE id = $1
        `, [request.assignment_id]);
      }

      // 5. 이벤트 기록
      await client.query(`
        INSERT INTO system_event_stream (
          id, event_type, event_category, title, description,
          project_id, user_id, event_timestamp,
          event_data, is_processed, requires_action
        ) VALUES (
          gen_random_uuid(), 'qc_progress_update', 'quality_assurance',
          'QC/QA 진행률 업데이트', $1,
          $2, $3, NOW(),
          $4, true, false
        )
      `, [
        `${request.project_name} 프로젝트의 품질 검증 진행률이 ${progress_percentage}%로 업데이트되었습니다.`,
        request.project_id,
        userId,
        JSON.stringify({
          request_id: requestId,
          old_progress: request.progress_percentage || 0,
          new_progress: progress_percentage,
          quality_score,
          notes
        })
      ]);

      await client.query('COMMIT');

      console.log('QC/QA 진행률 업데이트 성공:', {
        requestId,
        progress: progress_percentage
      });

      res.json({
        success: true,
        message: '진행률이 성공적으로 업데이트되었습니다.',
        data: {
          request_id: requestId,
          progress_percentage,
          quality_score,
          status: progress_percentage >= 100 ? 'completed' : 'in_progress'
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('QC/QA 진행률 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update QC progress',
      message: error.message
    });
  }
});

// QC/QA 최종 승인 API
router.post('/approve/:requestId', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { approval_status, final_notes } = req.body;
    const userId = req.user?.userId || req.user?.id;
    const userRole = req.user?.roleType;
    
    console.log('QC/QA 최종 승인 요청:', {
      requestId,
      approval_status,
      userId,
      userRole
    });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. QC/QA 요청 확인
      const requestResult = await client.query(`
        SELECT qr.*, p.name as project_name
        FROM qc_qa_requests qr
        JOIN projects p ON qr.project_id = p.id
        WHERE qr.id = $1
      `, [requestId]);

      if (requestResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({
          success: false,
          error: 'Request not found',
          message: '해당 QC/QA 요청을 찾을 수 없습니다.'
        });
      }

      const request = requestResult.rows[0];

      // 2. 승인 상태 업데이트
      await client.query(`
        UPDATE qc_qa_requests SET 
          approval_status = $1,
          approved_by = $2,
          approved_at = NOW(),
          updated_at = NOW()
        WHERE id = $3
      `, [approval_status, userId, requestId]);

      // 3. 승인된 경우 CI/CD 프로세스로 전달
      if (approval_status === 'approved') {
        // CI/CD 요청 테이블 생성 및 요청 등록
        await client.query(`
          CREATE TABLE IF NOT EXISTS cicd_requests (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id UUID NOT NULL REFERENCES projects(id),
            qc_request_id UUID NOT NULL REFERENCES qc_qa_requests(id),
            request_status VARCHAR(50) DEFAULT 'pending',
            deployment_environment VARCHAR(50) DEFAULT 'staging',
            requested_by UUID NOT NULL REFERENCES timbel_users(id),
            pipeline_config TEXT,
            deployment_notes TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          );
          
          INSERT INTO cicd_requests (
            project_id, qc_request_id, requested_by, deployment_notes
          ) VALUES ($1, $2, $3, $4)
        `, [request.project_id, requestId, userId, final_notes || 'QC/QA 승인 완료']);

        console.log('CI/CD 프로세스로 전달 완료');
      }

      // 4. 이벤트 기록
      await client.query(`
        INSERT INTO system_event_stream (
          id, event_type, event_category, title, description,
          project_id, user_id, event_timestamp,
          event_data, is_processed, requires_action
        ) VALUES (
          gen_random_uuid(), 'qc_final_approval', 'quality_assurance',
          'QC/QA 최종 승인', $1,
          $2, $3, NOW(),
          $4, true, $5
        )
      `, [
        `${request.project_name} 프로젝트의 품질 검증이 ${approval_status === 'approved' ? '승인' : '반려'}되었습니다.`,
        request.project_id,
        userId,
        JSON.stringify({
          request_id: requestId,
          approval_status,
          final_notes,
          approved_by_role: userRole,
          quality_score: request.quality_score
        }),
        approval_status === 'approved' // CI/CD 프로세스 필요
      ]);

      await client.query('COMMIT');

      console.log('QC/QA 최종 승인 처리 완료:', {
        requestId,
        approval_status
      });

      res.json({
        success: true,
        message: `품질 검증이 ${approval_status === 'approved' ? '승인' : '반려'}되었습니다.`,
        data: {
          request_id: requestId,
          approval_status,
          cicd_initiated: approval_status === 'approved'
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('QC/QA 최종 승인 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process final approval',
      message: error.message
    });
  }
});

// 테스트 실행 결과 업데이트 API
router.post('/test-execution/:testItemId', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const { testItemId } = req.params;
    const { execution_status, actual_result, defect_description, severity_level, notes } = req.body;
    const userId = req.user?.userId || req.user?.id;
    
    console.log('🧪 테스트 실행 결과 업데이트:', { testItemId, execution_status, userId });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 1. 테스트 항목 확인
      const testItemCheck = await client.query(`
        SELECT ti.*, tp.qc_request_id, tp.test_plan_name
        FROM qc_test_items ti
        JOIN qc_test_plans tp ON ti.test_plan_id = tp.id
        WHERE ti.id = $1
      `, [testItemId]);

      if (testItemCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Test item not found',
          message: '테스트 항목을 찾을 수 없습니다.'
        });
      }

      const testItem = testItemCheck.rows[0];

      // 2. 테스트 실행 결과 저장/업데이트
      const executionResult = await client.query(`
        INSERT INTO qc_test_executions (
          test_item_id, test_plan_id, executed_by, execution_status,
          actual_result, defect_description, severity_level, notes, executed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (test_item_id, test_plan_id, executed_by) 
        DO UPDATE SET
          execution_status = EXCLUDED.execution_status,
          actual_result = EXCLUDED.actual_result,
          defect_description = EXCLUDED.defect_description,
          severity_level = EXCLUDED.severity_level,
          notes = EXCLUDED.notes,
          executed_at = NOW(),
          updated_at = NOW()
        RETURNING id
      `, [
        testItemId,
        testItem.test_plan_id,
        userId,
        execution_status,
        actual_result || '',
        defect_description || '',
        severity_level || null,
        notes || ''
      ]);

      // 3. 결함이 발견된 경우 결함 테이블에 기록
      if (execution_status === 'failed' && defect_description) {
        await client.query(`
          INSERT INTO qc_defects (
            test_execution_id, qc_request_id, reported_by,
            defect_title, defect_description, severity_level, priority_level
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          executionResult.rows[0].id,
          testItem.qc_request_id,
          userId,
          `${testItem.item_name} - 테스트 실패`,
          defect_description,
          severity_level || 'medium',
          severity_level === 'critical' ? 'urgent' : 'normal'
        ]);
      }

      // 4. 테스트 메트릭스 업데이트
      await client.query(`
        UPDATE qc_test_metrics 
        SET 
          executed_items = (
            SELECT COUNT(*) FROM qc_test_executions 
            WHERE test_plan_id = $1 AND execution_status != 'pending'
          ),
          passed_items = (
            SELECT COUNT(*) FROM qc_test_executions 
            WHERE test_plan_id = $1 AND execution_status = 'passed'
          ),
          failed_items = (
            SELECT COUNT(*) FROM qc_test_executions 
            WHERE test_plan_id = $1 AND execution_status = 'failed'
          ),
          blocked_items = (
            SELECT COUNT(*) FROM qc_test_executions 
            WHERE test_plan_id = $1 AND execution_status = 'blocked'
          ),
          skipped_items = (
            SELECT COUNT(*) FROM qc_test_executions 
            WHERE test_plan_id = $1 AND execution_status = 'skipped'
          ),
          calculated_at = NOW()
        WHERE test_plan_id = $1
      `, [testItem.test_plan_id]);

      await client.query('COMMIT');

      console.log('✅ 테스트 실행 결과 업데이트 완료:', { testItemId, execution_status });

      res.json({
        success: true,
        message: '테스트 실행 결과가 업데이트되었습니다.',
        data: {
          test_item_id: testItemId,
          execution_status: execution_status
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 테스트 실행 결과 업데이트 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update test execution',
      message: error.message
    });
  }
});

// 테스트 계획 상세 조회 API
router.get('/test-plan/:requestId', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.userId || req.user?.id;
    
    console.log('📋 테스트 계획 상세 조회:', { requestId, userId });

    const client = await pool.connect();
    
    try {
      // QC 요청에서 직접 테스트 계획 데이터 조회
      const testPlanResult = await client.query(`
        SELECT 
          qr.id,
          qr.test_plan,
          qr.project_id,
          p.name as project_name,
          u.full_name as pe_name,
          qr.created_at
        FROM qc_qa_requests qr
        JOIN projects p ON qr.project_id = p.id
        JOIN timbel_users u ON qr.requested_by = u.id
        WHERE qr.id = $1
      `, [requestId]);

      if (testPlanResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Test plan not found',
          message: '테스트 계획을 찾을 수 없습니다.'
        });
      }

      const testPlan = testPlanResult.rows[0];

      // test_plan JSON 데이터 파싱
      let testPlanData = {};
      try {
        testPlanData = typeof testPlan.test_plan === 'string' 
          ? JSON.parse(testPlan.test_plan) 
          : testPlan.test_plan || {};
      } catch (parseError) {
        console.error('테스트 계획 데이터 파싱 오류:', parseError);
        testPlanData = {};
      }

      res.json({
        success: true,
        data: {
          id: testPlan.id,
          project_name: testPlan.project_name,
          pe_name: testPlan.pe_name,
          created_at: testPlan.created_at,
          ...testPlanData
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ 테스트 계획 상세 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch test plan details',
      message: error.message
    });
  }
});

// QC 피드백 및 히스토리 테이블 생성 함수
async function createQCFeedbackTables(client) {
  // QC 피드백 테이블
  await client.query(`
    CREATE TABLE IF NOT EXISTS qc_feedback_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      qc_request_id UUID REFERENCES qc_qa_requests(id) ON DELETE CASCADE,
      test_item_id VARCHAR(255), -- 실패한 테스트 항목 ID
      test_item_name VARCHAR(255), -- 실패한 테스트 항목명
      test_category VARCHAR(100), -- 테스트 카테고리
      feedback_type VARCHAR(20) DEFAULT 'bug',
      severity_level VARCHAR(20) DEFAULT 'medium',
      priority_level VARCHAR(20) DEFAULT 'normal',
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      steps_to_reproduce TEXT,
      expected_behavior TEXT,
      actual_behavior TEXT,
      test_environment TEXT,
      browser_os_info TEXT,
      assigned_to_pe UUID REFERENCES timbel_users(id),
      reported_by UUID REFERENCES timbel_users(id),
      feedback_status VARCHAR(20) DEFAULT 'assigned',
      qc_notes TEXT,
      attachment_files JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // QC 테스트 실패 히스토리 테이블
  await client.query(`
    CREATE TABLE IF NOT EXISTS qc_test_failure_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      qc_request_id UUID REFERENCES qc_qa_requests(id) ON DELETE CASCADE,
      test_item_id VARCHAR(255) NOT NULL,
      test_item_name VARCHAR(255) NOT NULL,
      test_category VARCHAR(100) NOT NULL,
      failure_reason TEXT,
      test_notes TEXT,
      reported_by UUID REFERENCES timbel_users(id),
      feedback_item_id UUID REFERENCES qc_feedback_items(id),
      project_id UUID,
      project_name VARCHAR(255),
      failure_date TIMESTAMP DEFAULT NOW(),
      status VARCHAR(20) DEFAULT 'reported', -- reported, acknowledged, in_progress, resolved, verified
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // QC 활동 로그 테이블
  await client.query(`
    CREATE TABLE IF NOT EXISTS qc_activity_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      qc_request_id UUID REFERENCES qc_qa_requests(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL, -- test_failure, feedback_sent, pe_response, issue_resolved, etc.
      activity_title VARCHAR(255) NOT NULL,
      activity_description TEXT,
      related_item_id UUID, -- feedback_item_id or test_failure_id
      performed_by UUID REFERENCES timbel_users(id),
      target_user UUID REFERENCES timbel_users(id), -- PE who received feedback
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

// 이슈 피드백 생성 API
router.post('/feedback', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const {
      qc_request_id,
      defect_id,
      feedback_type,
      severity_level,
      priority_level,
      title,
      description,
      steps_to_reproduce,
      expected_behavior,
      actual_behavior,
      test_environment,
      browser_os_info,
      assigned_to_pe, // 선택된 PE (없으면 원래 PE에게 할당)
      qc_notes,
      // 테스트 실패 관련 추가 정보
      test_item_id,
      test_item_name,
      test_category,
      is_test_failure = false // 테스트 실행 중 실패로 생성된 피드백인지 구분
    } = req.body;

    const userId = req.user?.userId || req.user?.id;
    
    console.log('🐛 이슈 피드백 생성:', { qc_request_id, feedback_type, severity_level, assigned_to_pe });

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // 0. QC 피드백 테이블 생성
      await createQCFeedbackTables(client);

      // 1. QC/QA 요청 및 프로젝트 정보 확인
      const requestCheck = await client.query(`
        SELECT 
          qr.*,
          p.project_name,
          p.id as project_id,
          pcr.submitted_by as original_pe_id,
          u.full_name as original_pe_name
        FROM qc_qa_requests qr
        JOIN projects p ON qr.project_id = p.id
        JOIN project_completion_reports pcr ON qr.completion_report_id = pcr.id
        JOIN timbel_users u ON pcr.submitted_by = u.id
        WHERE qr.id = $1
      `, [qc_request_id]);

      if (requestCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'QC request not found',
          message: 'QC/QA 요청을 찾을 수 없습니다.'
        });
      }

      const request = requestCheck.rows[0];

      // 2. 할당할 PE 결정 (지정된 PE가 있으면 그 PE, 없으면 원래 개발한 PE)
      const targetPeId = assigned_to_pe || request.original_pe_id;

      // 3. 할당할 PE가 유효한지 확인
      const peCheck = await client.query(`
        SELECT id, full_name, role_type 
        FROM timbel_users 
        WHERE id = $1 AND role_type = 'pe' AND is_active = true
      `, [targetPeId]);

      if (peCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid PE assignment',
          message: '할당할 PE를 찾을 수 없거나 비활성 상태입니다.'
        });
      }

      const assignedPe = peCheck.rows[0];

      // 4. 피드백 아이템 생성
      const feedbackResult = await client.query(`
        INSERT INTO qc_feedback_items (
          qc_request_id, defect_id, project_id, reported_by, assigned_to_pe, original_pe,
          feedback_type, severity_level, priority_level, title, description,
          steps_to_reproduce, expected_behavior, actual_behavior,
          test_environment, browser_os_info, qc_notes, feedback_status, assigned_at,
          test_item_id, test_item_name, test_category
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), $19, $20, $21)
        RETURNING id
      `, [
        qc_request_id,
        defect_id || null,
        request.project_id,
        userId,
        targetPeId,
        request.original_pe_id,
        feedback_type,
        severity_level,
        priority_level || 'normal',
        title,
        description,
        steps_to_reproduce || '',
        expected_behavior || '',
        actual_behavior || '',
        test_environment || '',
        browser_os_info || '',
        qc_notes || '',
        'assigned',
        test_item_id || null,
        test_item_name || null,
        test_category || null
      ]);

      const feedbackId = feedbackResult.rows[0].id;

      // 4.5. 테스트 실패 히스토리 및 활동 로그 생성 (테스트 실패인 경우)
      if (is_test_failure && test_item_id && test_item_name) {
        // 테스트 실패 히스토리 생성
        await client.query(`
          INSERT INTO qc_test_failure_history (
            qc_request_id, test_item_id, test_item_name, test_category,
            failure_reason, test_notes, reported_by, feedback_item_id,
            project_id, project_name, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          qc_request_id,
          test_item_id,
          test_item_name,
          test_category || '기타',
          description,
          qc_notes || '',
          userId,
          feedbackId,
          request.project_id,
          request.project_name,
          'reported'
        ]);

        // 활동 로그 생성 - 테스트 실패 보고
        await client.query(`
          INSERT INTO qc_activity_logs (
            qc_request_id, activity_type, activity_title, activity_description,
            related_item_id, performed_by, target_user, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          qc_request_id,
          'test_failure',
          `테스트 실패: ${test_item_name}`,
          `${test_category} 카테고리의 "${test_item_name}" 테스트 항목에서 실패가 발생했습니다.`,
          feedbackId,
          userId,
          targetPeId,
          JSON.stringify({
            test_item_id,
            test_item_name,
            test_category,
            severity_level,
            priority_level
          })
        ]);
      }

      // 활동 로그 생성 - 피드백 전송
      await client.query(`
        INSERT INTO qc_activity_logs (
          qc_request_id, activity_type, activity_title, activity_description,
          related_item_id, performed_by, target_user, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        qc_request_id,
        'feedback_sent',
        `이슈 피드백 전송: ${title}`,
        `QC/QA에서 ${assignedPe.full_name}에게 이슈 피드백을 전송했습니다.`,
        feedbackId,
        userId,
        targetPeId,
        JSON.stringify({
          feedback_type,
          severity_level,
          priority_level,
          is_test_failure
        })
      ]);

      // 5. PE에게 알림 메시지 생성 (통합 시스템 사용)
      const messageResult = await client.query(`
        INSERT INTO unified_messages (
          title, content, message_type, priority, sender_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        `QC/QA 피드백: ${title}`,
        `프로젝트 "${request.project_name}"에 대한 QC/QA 피드백이 등록되었습니다.\n\n` +
        `피드백 유형: ${feedback_type}\n` +
        `심각도: ${severity_level}\n` +
        `우선순위: ${priority_level}\n\n` +
        `${description}`,
        'qc_feedback',
        severity_level === 'critical' ? 4 : 2, // priority as number
        userId,
        JSON.stringify({
          event_category: 'qc_feedback',
          event_source: 'user',
          project_id: request.project_id,
          feedback_type: feedback_type,
          severity_level: severity_level,
          priority_level: priority_level
        })
      ]);

      const messageId = messageResult.rows[0].id;

      await client.query(`
        INSERT INTO unified_message_recipients (message_id, recipient_id)
        VALUES ($1, $2)
      `, [messageId, targetPeId]);

      // 6. 커뮤니케이션 로그 생성 (초기 할당 메시지)
      await client.query(`
        INSERT INTO qc_pe_communications (
          feedback_item_id, sender_id, receiver_id, message_type, message
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        feedbackId,
        userId,
        targetPeId,
        'assignment',
        `QC/QA 피드백이 할당되었습니다. 확인 후 처리 부탁드립니다.`
      ]);

      // 7. 시스템 이벤트 기록
      await client.query(`
        INSERT INTO system_event_stream (
          id, event_type, event_category, title, description,
          project_id, user_id, event_timestamp, event_data, is_processed, requires_action
        ) VALUES (
          gen_random_uuid(), 'qc_feedback_created', 'quality_assurance',
          'QC/QA 피드백 생성', $1,
          $2, $3, NOW(), $4, true, true
        )
      `, [
        `${request.project_name} 프로젝트에 QC/QA 피드백이 생성되었습니다: ${title}`,
        request.project_id,
        userId,
        JSON.stringify({
          feedback_id: feedbackId,
          qc_request_id: qc_request_id,
          project_name: request.project_name,
          feedback_type: feedback_type,
          severity_level: severity_level,
          assigned_to_pe: targetPeId,
          assigned_pe_name: assignedPe.full_name
        })
      ]);

      await client.query('COMMIT');

      console.log('✅ QC/QA 피드백 생성 완료:', { feedbackId, targetPeId, severity_level });

      res.json({
        success: true,
        message: 'QC/QA 피드백이 성공적으로 생성되었습니다.',
        data: {
          feedback_id: feedbackId,
          assigned_to_pe: targetPeId,
          assigned_pe_name: assignedPe.full_name,
          status: 'assigned'
        }
      });

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ QC/QA 피드백 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create feedback',
      message: error.message
    });
  }
});

// PE 목록 조회 API (피드백 할당용)
router.get('/available-pes/:projectId?', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const { projectId } = req.params;
    
    console.log('👥 피드백 할당 가능한 PE 목록 조회:', { projectId });

    const client = await pool.connect();
    
    try {
      let query = `
        SELECT 
          u.id,
          u.username,
          u.full_name,
          u.email,
          COUNT(pwa.id) as active_assignments,
          COUNT(qfi.id) as pending_feedbacks
        FROM timbel_users u
        LEFT JOIN project_work_assignments pwa ON u.id = pwa.assigned_to 
          AND pwa.assignment_status IN ('assigned', 'in_progress')
        LEFT JOIN qc_feedback_items qfi ON u.id = qfi.assigned_to_pe 
          AND qfi.feedback_status IN ('assigned', 'in_progress')
        WHERE u.role_type = 'pe' AND u.status = 'active'
        GROUP BY u.id, u.username, u.full_name, u.email
        ORDER BY active_assignments ASC, pending_feedbacks ASC, u.full_name ASC
      `;

      let queryParams = [];

      // 특정 프로젝트의 원래 개발자 정보도 함께 조회
      if (projectId) {
        const originalPeResult = await client.query(`
          SELECT 
            u.id,
            u.full_name,
            u.username
          FROM projects p
          JOIN project_completion_reports pcr ON p.id = pcr.project_id
          JOIN timbel_users u ON pcr.submitted_by = u.id
          WHERE p.id = $1
        `, [projectId]);

        const pesResult = await client.query(query, queryParams);

        res.json({
          success: true,
          data: {
            available_pes: pesResult.rows,
            original_pe: originalPeResult.rows[0] || null
          }
        });
      } else {
        const pesResult = await client.query(query, queryParams);

        res.json({
          success: true,
          data: {
            available_pes: pesResult.rows,
            original_pe: null
          }
        });
      }

    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ PE 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available PEs',
      message: error.message
    });
  }
});

// 테스트 실행 결과 저장 API
router.post('/test-execution', async (req, res) => {
  try {
    const { request_id, execution_results, overall_status, quality_score, total_tests, passed_tests, failed_tests, completion_date } = req.body;
    const userId = req.user.userId;

    console.log('테스트 실행 결과 저장 요청:', { request_id, overall_status, results_count: execution_results?.length });

    if (!request_id || !execution_results || !overall_status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: '필수 필드가 누락되었습니다.'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // QC 테스트 실행 테이블 생성 (없는 경우)
      await client.query(`
        CREATE TABLE IF NOT EXISTS qc_test_executions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          request_id UUID NOT NULL REFERENCES qc_qa_requests(id),
          executed_by UUID NOT NULL REFERENCES timbel_users(id),
          execution_results JSONB NOT NULL,
          overall_status VARCHAR(20) NOT NULL CHECK (overall_status IN ('passed', 'failed', 'partial')),
          total_tests INTEGER NOT NULL,
          passed_tests INTEGER NOT NULL,
          failed_tests INTEGER NOT NULL,
          execution_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completion_date TIMESTAMP,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 테스트 결과 통계 (프론트엔드에서 전달받은 값 사용, 없으면 계산)
      const finalTotalTests = total_tests || execution_results.length;
      const finalPassedTests = passed_tests || execution_results.filter(item => item.status === 'passed').length;
      const finalFailedTests = failed_tests || execution_results.filter(item => item.status === 'failed').length;

      // 테스트 실행 결과 저장
      const executionResult = await client.query(`
        INSERT INTO qc_test_executions (
          request_id, executed_by, execution_results, overall_status,
          total_tests, passed_tests, failed_tests, completion_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, execution_date
      `, [
        request_id, userId, JSON.stringify(execution_results), overall_status,
        finalTotalTests, finalPassedTests, finalFailedTests, completion_date
      ]);

      // QC 요청 상태 업데이트
      const newRequestStatus = overall_status === 'passed' ? 'completed' : 'in_progress';
      await client.query(`
        UPDATE qc_qa_requests 
        SET request_status = $1, quality_score = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [newRequestStatus, quality_score || 0, request_id]);

      // 실패한 테스트가 있는 경우 자동으로 피드백 생성
      if (finalFailedTests > 0) {
        const failedItems = execution_results.filter(item => item.status === 'failed');
        
        // 프로젝트 정보 조회
        const projectInfo = await client.query(`
          SELECT p.name as project_name, pcr.submitted_by as pe_id
          FROM qc_qa_requests qqr
          JOIN project_completion_reports pcr ON qqr.completion_report_id = pcr.id
          JOIN projects p ON pcr.project_id = p.id
          WHERE qqr.id = $1
        `, [request_id]);

        if (projectInfo.rows.length > 0) {
          const { project_name, pe_id } = projectInfo.rows[0];

          // 실패한 각 테스트에 대해 피드백 생성
          for (const failedItem of failedItems) {
            await client.query(`
              INSERT INTO qc_feedback_items (
                request_id, feedback_type, severity_level, priority_level,
                title, description, assigned_to_pe, reported_by, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              request_id, 'bug', 'high', 'high',
              `테스트 실패: ${failedItem.item}`,
              `테스트 항목 "${failedItem.item}"이 실패했습니다.\n\n카테고리: ${failedItem.category}\n설명: ${failedItem.description}\n메모: ${failedItem.notes || '없음'}`,
              pe_id, userId, 'open'
            ]);
          }

          console.log(`✅ ${failedTests}개의 실패한 테스트에 대한 피드백 생성 완료`);
        }
      }

      // 시스템 이벤트 로그 생성
      await client.query(`
        INSERT INTO system_event_stream (
          event_type, user_id, event_data, created_at
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      `, [
        'qc_test_execution',
        userId,
        JSON.stringify({
          request_id,
          overall_status,
          total_tests: totalTests,
          passed_tests: passedTests,
          failed_tests: failedTests,
          execution_id: executionResult.rows[0].id
        })
      ]);

      await client.query('COMMIT');

      console.log('✅ 테스트 실행 결과 저장 완료:', executionResult.rows[0].id);

      res.json({
        success: true,
        data: {
          execution_id: executionResult.rows[0].id,
          execution_date: executionResult.rows[0].execution_date,
          overall_status,
          total_tests: totalTests,
          passed_tests: passedTests,
          failed_tests: failedTests
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('테스트 실행 결과 저장 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save test execution results',
      message: '테스트 실행 결과 저장에 실패했습니다.'
    });
  }
});

// 테스트 계획 조회 API (테스트 실행용)
// QC 활동 로그 조회 API
router.get('/activity-logs/:requestId', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { limit = 20 } = req.query;

    const client = await pool.connect();
    
    try {
      // 테이블 존재 확인
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'qc_activity_logs'
        );
      `);

      if (!tableExists.rows[0].exists) {
        // 테이블이 없으면 빈 결과 반환
        return res.json({
          success: true,
          data: []
        });
      }

      const result = await client.query(`
        SELECT 
          al.*,
          performer.full_name as performer_name,
          performer.username as performer_username,
          target.full_name as target_name,
          target.username as target_username,
          CASE 
            WHEN al.activity_type = 'test_failure' THEN '테스트 실패'
            WHEN al.activity_type = 'feedback_sent' THEN '피드백 전송'
            WHEN al.activity_type = 'pe_response' THEN 'PE 응답'
            WHEN al.activity_type = 'issue_resolved' THEN '이슈 해결'
            WHEN al.activity_type = 'issue_verified' THEN '이슈 검증'
            ELSE al.activity_type
          END as activity_type_display
        FROM qc_activity_logs al
        LEFT JOIN timbel_users performer ON al.performed_by = performer.id
        LEFT JOIN timbel_users target ON al.target_user = target.id
        WHERE al.qc_request_id = $1
        ORDER BY al.created_at DESC
        LIMIT $2
      `, [requestId, limit]);

      res.json({
        success: true,
        data: result.rows
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ QC 활동 로그 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity logs',
      message: error.message
    });
  }
});

// QC 테스트 실패 히스토리 조회 API
router.get('/failure-history/:requestId', jwtAuth.verifyToken, jwtAuth.requireRole(['qa', 'admin', 'executive']), async (req, res) => {
  try {
    const { requestId } = req.params;

    const client = await pool.connect();
    
    try {
      // 테이블 존재 확인
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'qc_test_failure_history'
        );
      `);

      if (!tableExists.rows[0].exists) {
        // 테이블이 없으면 빈 결과 반환
        return res.json({
          success: true,
          data: []
        });
      }

      const result = await client.query(`
        SELECT 
          fh.*,
          reporter.full_name as reporter_name,
          fi.title as feedback_title,
          fi.feedback_status,
          fi.severity_level,
          CASE 
            WHEN fh.status = 'reported' THEN '보고됨'
            WHEN fh.status = 'acknowledged' THEN '확인됨'
            WHEN fh.status = 'in_progress' THEN '진행중'
            WHEN fh.status = 'resolved' THEN '해결됨'
            WHEN fh.status = 'verified' THEN '검증완료'
            ELSE fh.status
          END as status_display
        FROM qc_test_failure_history fh
        LEFT JOIN timbel_users reporter ON fh.reported_by = reporter.id
        LEFT JOIN qc_feedback_items fi ON fh.feedback_item_id = fi.id
        WHERE fh.qc_request_id = $1
        ORDER BY fh.failure_date DESC
      `, [requestId]);

      res.json({
        success: true,
        data: result.rows
      });

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ QC 실패 히스토리 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch failure history',
      message: error.message
    });
  }
});

module.exports = router;
