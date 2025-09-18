// [advice from AI] 승인 워크플로우 엔진
// 개발계획서의 권한 구조를 기반으로 한 다단계 승인 시스템

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

class ApprovalWorkflowEngine {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'timbel_user',
      host: process.env.DB_HOST || 'postgres',
      database: process.env.DB_NAME || 'timbel_knowledge',
      password: process.env.DB_PASSWORD || 'timbel_password',
      port: process.env.DB_PORT || 5432,
    });

    // [advice from AI] 개발계획서 기반 권한 레벨 정의
    this.permissionLevels = {
      0: { name: '최고 관리자', role: 'admin', description: '전체 시스템 현황 및 성과 분석, 조직 관리 및 전략적 의사결정' },
      1: { name: 'PO (프로젝트 오너)', role: 'po', description: '프로젝트 전체 현황 관리, PE별 업무 배정 및 성과 관리' },
      2: { name: 'PE (프로젝트 엔지니어)', role: 'pe', description: '할당된 프로젝트 개발, 코드 라이브러리화 및 등록' },
      3: { name: 'QA/QC 부서', role: 'qa', description: '테스트 계획 수립 및 실행, 품질 검사 및 결함 관리' },
      4: { name: '운영팀', role: 'ops', description: 'ECP-AI K8s 기반 서비스 배포, 멀티테넌트 환경 관리' }
    };

    // [advice from AI] 개발 단계별 승인 워크플로우 규칙
    this.developmentStageRules = {
      // 코드 컴포넌트 개발 승인
      'code_component': {
        requiredApprovers: ['pe_lead'],
        description: '코드 컴포넌트 개발 및 라이브러리화',
        priority: 'medium',
        timeout_hours: 24
      },
      // 솔루션 배포 승인
      'solution_deployment': {
        requiredApprovers: ['pe_lead', 'qa_manager', 'ops_manager'],
        description: '솔루션 배포 및 운영 환경 적용',
        priority: 'high',
        timeout_hours: 48
      },
      // 프로토타입 QC 승인
      'prototype_qc': {
        requiredApprovers: ['qa_manager', 'pe_lead'],
        description: '프로토타입 품질 검사 및 버그 수정 승인',
        priority: 'high',
        timeout_hours: 12
      },
      // 출시 승인
      'release_approval': {
        requiredApprovers: ['qa_manager', 'po', 'ops_manager'],
        description: '최종 출시 승인 및 배포',
        priority: 'urgent',
        timeout_hours: 24
      },
      // 시스템 등록 승인
      'system_registration': {
        requiredApprovers: ['qa_manager', 'po', 'admin'],
        description: '새로운 시스템 등록 및 지식 자산 승인',
        priority: 'medium',
        timeout_hours: 48
      },
      // 버그 수정 승인
      'bug_fix': {
        requiredApprovers: ['qa_manager'],
        description: '버그 수정 및 재배포 승인',
        priority: 'high',
        timeout_hours: 6
      },
      // 아키텍처 변경 승인
      'architecture_change': {
        requiredApprovers: ['pe_lead', 'po', 'admin'],
        description: '시스템 아키텍처 변경 승인',
        priority: 'urgent',
        timeout_hours: 72
      }
    };

    // [advice from AI] QC 단계별 승인 규칙
    this.qcStageRules = {
      'prototype_review': {
        requiredApprovers: ['qa_manager'],
        description: '프로토타입 초기 검토',
        priority: 'medium',
        timeout_hours: 24
      },
      'bug_verification': {
        requiredApprovers: ['qa_manager', 'pe_lead'],
        description: '버그 수정 검증',
        priority: 'high',
        timeout_hours: 12
      },
      'final_approval': {
        requiredApprovers: ['qa_manager', 'po'],
        description: '최종 출시 승인',
        priority: 'urgent',
        timeout_hours: 24
      }
    };
  }

  // [advice from AI] 승인 워크플로우 생성
  async createApprovalWorkflow(requestData) {
    try {
      const {
        approval_type, // 'code_component', 'solution_deployment', 'prototype_qc', 'release_approval', 'bug_fix', 'architecture_change'
        qc_stage, // 'prototype_review', 'bug_verification', 'final_approval'
        requester_id,
        department_id,
        project_id,
        priority = 'medium',
        component_id,
        version,
        description
      } = requestData;

      // [advice from AI] 요청자 정보 조회
      const requesterResult = await this.pool.query(`
        SELECT u.*, d.name as department_name
        FROM timbel_users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.id = $1
      `, [requester_id]);

      if (requesterResult.rows.length === 0) {
        throw new Error('요청자 정보를 찾을 수 없습니다');
      }

      const requester = requesterResult.rows[0];

      // [advice from AI] 개발 단계별 승인 규칙 결정
      let approvalRules = null;
      if (approval_type) {
        approvalRules = this.developmentStageRules[approval_type];
      } else if (qc_stage) {
        approvalRules = this.qcStageRules[qc_stage];
      }
      
      if (!approvalRules) {
        throw new Error('유효하지 않은 승인 유형입니다');
      }
      
      // [advice from AI] 승인자 목록 생성
      const approvers = await this.generateApproverList(
        approvalRules,
        requester,
        approval_type || qc_stage,
        component_id,
        version
      );

      // [advice from AI] 워크플로우 단계 생성
      const workflowSteps = this.createWorkflowSteps(approvers, approvalRules);

      return {
        success: true,
        data: {
          approvalType: approval_type || qc_stage,
          approvalRules,
          approvers,
          workflowSteps,
          estimatedDuration: this.calculateEstimatedDuration(workflowSteps),
          escalationRules: this.getEscalationRules(approval_type || qc_stage)
        },
        message: '승인 워크플로우가 생성되었습니다'
      };

    } catch (error) {
      console.error('승인 워크플로우 생성 실패:', error);
      throw new Error(`승인 워크플로우 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] 승인자 목록 생성
  async generateApproverList(approvalRules, requester, approvalType, componentId, version) {
    const approvers = [];
    let stepOrder = 1;

    // [advice from AI] 승인 규칙에서 필요한 승인자 유형 가져오기
    const requiredApprovers = approvalRules.requiredApprovers || [];

    for (const approverType of requiredApprovers) {
      const approver = await this.findApproverByType(approverType, requester, approvalType);
      if (approver) {
        approvers.push({
          step_order: stepOrder++,
          approver_type: approverType,
          approver_id: approver.id,
          approver_name: approver.full_name,
          approver_email: approver.email,
          role: approver.role_type,
          permission_level: approver.permission_level,
          department: approver.department_name,
          is_required: true,
          can_skip: false,
          timeout_hours: approvalRules.timeout_hours || 24,
          escalation_config: this.getEscalationConfig(approverType),
          component_id: componentId,
          version: version
        });
      }
    }

    // [advice from AI] 특별 승인자 추가 (아키텍처 변경의 경우)
    if (approvalType === 'architecture_change') {
      const adminApprover = await this.findApproverByType('admin', requester, approvalType);
      if (adminApprover) {
        approvers.push({
          step_order: stepOrder++,
          approver_type: 'admin',
          approver_id: adminApprover.id,
          approver_name: adminApprover.full_name,
          approver_email: adminApprover.email,
          role: adminApprover.role_type,
          permission_level: adminApprover.permission_level,
          department: adminApprover.department_name,
          is_required: true,
          can_skip: false,
          timeout_hours: 72,
          escalation_config: { escalate_to: 'executive', after_hours: 48 }
        });
      }
    }

    return approvers;
  }

  // [advice from AI] 승인자 유형별 승인자 찾기
  async findApproverByType(approverType, requester, approvalType) {
    let query = '';
    let params = [];

    switch (approverType) {
      case 'pe_lead':
        // [advice from AI] PE 리드 (같은 부서의 Level 2 사용자 중 리드 역할)
        query = `
          SELECT u.*, d.name as department_name
          FROM timbel_users u
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.permission_level = 2 
          AND u.role_type = 'pe'
          AND u.department_id = $1
          AND u.status = 'active'
          ORDER BY u.created_at ASC
          LIMIT 1
        `;
        params = [requester.department_id];
        break;

      case 'qa_manager':
        // [advice from AI] QA/QC 매니저 (Level 3 사용자)
        query = `
          SELECT u.*, d.name as department_name
          FROM timbel_users u
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.permission_level = 3 
          AND u.role_type = 'qa'
          AND u.status = 'active'
          ORDER BY u.created_at ASC
          LIMIT 1
        `;
        break;

      case 'po':
        // [advice from AI] PO (Level 1 사용자)
        query = `
          SELECT u.*, d.name as department_name
          FROM timbel_users u
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.permission_level = 1 
          AND u.role_type = 'po'
          AND u.status = 'active'
          ORDER BY u.created_at ASC
          LIMIT 1
        `;
        break;

      case 'admin':
        // [advice from AI] 최고 관리자 (Level 0 사용자)
        query = `
          SELECT u.*, d.name as department_name
          FROM timbel_users u
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.permission_level = 0 
          AND u.role_type = 'admin'
          AND u.status = 'active'
          ORDER BY u.created_at ASC
          LIMIT 1
        `;
        break;

      case 'ops_manager':
        // [advice from AI] 운영팀 매니저 (Level 4 사용자)
        query = `
          SELECT u.*, d.name as department_name
          FROM timbel_users u
          LEFT JOIN departments d ON u.department_id = d.id
          WHERE u.permission_level = 4 
          AND u.role_type = 'ops'
          AND u.status = 'active'
          ORDER BY u.created_at ASC
          LIMIT 1
        `;
        break;

      default:
        return null;
    }

    const result = await this.pool.query(query, params);
    return result.rows[0] || null;
  }

  // [advice from AI] 재무 승인자 찾기
  async findFinanceApprover() {
    const query = `
      SELECT u.*, d.name as department_name
      FROM timbel_users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE (u.role_type = 'admin' OR u.permission_level <= 1)
      AND u.status = 'active'
      AND (u.full_name ILIKE '%재무%' OR u.full_name ILIKE '%finance%' OR d.name ILIKE '%재무%')
      ORDER BY u.permission_level ASC
      LIMIT 1
    `;

    const result = await this.pool.query(query);
    return result.rows[0] || null;
  }

  // [advice from AI] 워크플로우 단계 생성
  createWorkflowSteps(approvers, approvalLevel) {
    const steps = [];

    approvers.forEach((approver, index) => {
      steps.push({
        step_id: uuidv4(),
        step_order: approver.step_order,
        step_name: `${this.permissionLevels[approver.permission_level].name} 승인`,
        approver_type: approver.approver_type,
        approver_id: approver.approver_id,
        approver_name: approver.approver_name,
        is_required: approver.is_required,
        can_skip: approver.can_skip,
        timeout_hours: approver.timeout_hours,
        escalation_config: approver.escalation_config,
        parallel_approval: this.canProcessInParallel(approver, approvers, index),
        conditions: this.getStepConditions(approver, approvalLevel)
      });
    });

    return steps;
  }

  // [advice from AI] 병렬 처리 가능 여부 확인
  canProcessInParallel(currentApprover, allApprovers, currentIndex) {
    // [advice from AI] 같은 레벨의 승인자는 병렬 처리 가능
    const sameLevelApprovers = allApprovers.filter(a => 
      a.permission_level === currentApprover.permission_level && 
      a.step_order !== currentApprover.step_order
    );
    
    return sameLevelApprovers.length > 0;
  }

  // [advice from AI] 단계별 조건 설정
  getStepConditions(approver, approvalLevel) {
    const conditions = [];

    // [advice from AI] 금액 기반 조건
    if (approver.permission_level <= 1) {
      conditions.push({
        type: 'amount_threshold',
        value: 1000000,
        operator: '>=',
        description: '100만원 이상의 경우 추가 검토 필요'
      });
    }

    // [advice from AI] 프로젝트 유형 기반 조건
    if (approver.approver_type === 'qa_manager') {
      conditions.push({
        type: 'project_type',
        value: ['development', 'testing'],
        operator: 'in',
        description: '개발 및 테스트 관련 프로젝트'
      });
    }

    return conditions;
  }

  // [advice from AI] 타임아웃 시간 설정
  getTimeoutHours(approverType, amount) {
    const baseTimeouts = {
      'pe_lead': 24,
      'qa_manager': 48,
      'po': 72,
      'admin': 96,
      'ops_manager': 48,
      'finance': 72
    };

    let timeout = baseTimeouts[approverType] || 48;

    // [advice from AI] 금액에 따른 타임아웃 조정
    if (amount > 5000000) {
      timeout *= 1.5; // 고액의 경우 더 많은 시간
    } else if (amount < 100000) {
      timeout *= 0.5; // 소액의 경우 빠른 처리
    }

    return Math.round(timeout);
  }

  // [advice from AI] 에스컬레이션 설정
  getEscalationConfig(approverType) {
    const escalationRules = {
      'pe_lead': { escalate_to: 'qa_manager', after_hours: 12 },
      'qa_manager': { escalate_to: 'po', after_hours: 24 },
      'po': { escalate_to: 'admin', after_hours: 48 },
      'ops_manager': { escalate_to: 'admin', after_hours: 24 },
      'finance': { escalate_to: 'admin', after_hours: 36 }
    };

    return escalationRules[approverType] || { escalate_to: 'admin', after_hours: 48 };
  }

  // [advice from AI] 예상 처리 시간 계산
  calculateEstimatedDuration(workflowSteps) {
    let totalHours = 0;
    let maxParallelHours = 0;
    let currentLevel = null;
    let levelHours = 0;

    workflowSteps.forEach(step => {
      if (step.parallel_approval && step.permission_level === currentLevel) {
        // [advice from AI] 병렬 처리되는 경우 더 긴 시간만 계산
        levelHours = Math.max(levelHours, step.timeout_hours);
      } else {
        // [advice from AI] 이전 레벨 시간 추가
        if (levelHours > 0) {
          totalHours += levelHours;
        }
        currentLevel = step.permission_level;
        levelHours = step.timeout_hours;
      }
    });

    // [advice from AI] 마지막 레벨 시간 추가
    if (levelHours > 0) {
      totalHours += levelHours;
    }

    return {
      estimated_hours: totalHours,
      estimated_days: Math.ceil(totalHours / 24),
      max_parallel_hours: maxParallelHours
    };
  }

  // [advice from AI] 에스컬레이션 규칙 가져오기
  getEscalationRules(approvalLevel) {
    const rules = {
      'pe': [
        { condition: 'timeout', action: 'escalate_to_qa', after_hours: 12 },
        { condition: 'rejection', action: 'notify_requester', immediate: true }
      ],
      'qa': [
        { condition: 'timeout', action: 'escalate_to_po', after_hours: 24 },
        { condition: 'rejection', action: 'notify_requester_and_pe', immediate: true }
      ],
      'po': [
        { condition: 'timeout', action: 'escalate_to_admin', after_hours: 48 },
        { condition: 'rejection', action: 'notify_all_stakeholders', immediate: true }
      ],
      'admin': [
        { condition: 'timeout', action: 'auto_approve', after_hours: 96 },
        { condition: 'rejection', action: 'notify_board', immediate: true }
      ]
    };

    return rules[approvalLevel] || [];
  }

  // [advice from AI] 워크플로우 템플릿 생성
  async createWorkflowTemplate(templateData) {
    try {
      const {
        name,
        description,
        type,
        department_id,
        min_amount,
        max_amount,
        currency = 'KRW',
        workflow_steps,
        created_by
      } = templateData;

      const result = await this.pool.query(`
        INSERT INTO approval_workflow_templates (
          name, description, type, department_id, min_amount, max_amount, 
          currency, workflow_steps, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, template_id, created_at
      `, [
        name, description, type, department_id, min_amount, max_amount,
        currency, JSON.stringify(workflow_steps), created_by
      ]);

      return {
        success: true,
        data: result.rows[0],
        message: '워크플로우 템플릿이 생성되었습니다'
      };

    } catch (error) {
      console.error('워크플로우 템플릿 생성 실패:', error);
      throw new Error(`워크플로우 템플릿 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] 워크플로우 실행
  async executeWorkflow(request_id, workflowSteps) {
    try {
      const client = await this.pool.connect();
      
      try {
        await client.query('BEGIN');

        // [advice from AI] 각 단계별 승인자 할당
        for (const step of workflowSteps) {
          await client.query(`
            INSERT INTO approval_assignments (
              request_id, approver_id, level, timeout_hours, escalation_config
            ) VALUES ($1, $2, $3, $4, $5)
          `, [
            request_id,
            step.approver_id,
            step.step_order,
            step.timeout_hours || 24,
            JSON.stringify({
              step_id: step.step_id,
              step_name: step.step_name,
              approver_type: step.approver_type,
              timeout_hours: step.timeout_hours,
              escalation_config: step.escalation_config,
              parallel_approval: step.parallel_approval,
              conditions: step.conditions
            })
          ]);
        }

        await client.query('COMMIT');

        return {
          success: true,
          message: '워크플로우가 실행되었습니다',
          steps_created: workflowSteps.length
        };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('워크플로우 실행 실패:', error);
      throw new Error(`워크플로우 실행 실패: ${error.message}`);
    }
  }

  // [advice from AI] 서비스 종료
  async close() {
    await this.pool.end();
  }
}

module.exports = ApprovalWorkflowEngine;
