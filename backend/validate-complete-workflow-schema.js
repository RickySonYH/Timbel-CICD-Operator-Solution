// [advice from AI] 완전한 워크플로우 데이터베이스 스키마 검증 및 생성
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] 필요한 테이블 정의
const requiredTables = {
  // 기존 테이블들
  projects: {
    exists: false,
    description: '프로젝트 기본 정보',
    priority: 1
  },
  project_approvals: {
    exists: false,
    description: 'PO 승인 정보',
    priority: 2
  },
  work_groups: {
    exists: false,
    description: '작업 그룹',
    priority: 3
  },
  project_work_assignments: {
    exists: false,
    description: 'PE 할당 정보',
    priority: 3
  },
  project_completion_reports: {
    exists: false,
    description: 'PE 완료 보고서',
    priority: 4
  },
  qc_qa_requests: {
    exists: false,
    description: 'QA 검증 요청',
    priority: 5
  },
  system_registrations: {
    exists: false,
    description: '배포 요청',
    priority: 6
  },
  build_failures: {
    exists: false,
    description: '빌드 실패 로그',
    priority: 8
  },
  issue_reports: {
    exists: false,
    description: '이슈 보고서',
    priority: 8
  },
  systems: {
    exists: false,
    description: '운영 중인 시스템',
    priority: 9
  },
  
  // 새로 추가 필요한 테이블들
  project_status_history: {
    exists: false,
    description: '프로젝트 상태 변경 이력',
    priority: 1,
    create_sql: `
      CREATE TABLE project_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        from_status VARCHAR,
        to_status VARCHAR,
        changed_by UUID REFERENCES timbel_users(id),
        change_reason TEXT,
        change_type VARCHAR DEFAULT 'normal', -- normal, forced, emergency, rollback
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_project_status_history_project_id ON project_status_history(project_id);
      CREATE INDEX idx_project_status_history_created_at ON project_status_history(created_at);
    `
  },
  
  project_control_actions: {
    exists: false,
    description: '프로젝트 제어 액션 (중지, 취소 등)',
    priority: 1,
    create_sql: `
      CREATE TABLE project_control_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        action_type VARCHAR NOT NULL, -- suspend, cancel, force_approve, force_reject, emergency_stop, rollback
        initiated_by UUID REFERENCES timbel_users(id),
        target_stage VARCHAR, -- 어느 단계에서 액션을 취했는지
        reason TEXT NOT NULL,
        approval_required BOOLEAN DEFAULT FALSE,
        approved_by UUID REFERENCES timbel_users(id),
        approved_at TIMESTAMP,
        executed_at TIMESTAMP,
        status VARCHAR DEFAULT 'pending', -- pending, approved, rejected, executed, failed
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_project_control_actions_project_id ON project_control_actions(project_id);
      CREATE INDEX idx_project_control_actions_status ON project_control_actions(status);
    `
  },
  
  project_completion_approvals: {
    exists: false,
    description: 'PO 최종 승인 및 지식자원 등록 결정',
    priority: 6,
    create_sql: `
      CREATE TABLE project_completion_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id),
        approver_id UUID REFERENCES timbel_users(id),
        knowledge_resource_decision VARCHAR DEFAULT 'register', -- register, skip, later
        knowledge_resource_category VARCHAR,
        final_approval_comment TEXT,
        business_value_assessment TEXT,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_project_completion_approvals_project_id ON project_completion_approvals(project_id);
    `
  },
  
  deployment_approvals: {
    exists: false,
    description: '운영팀 배포 승인',
    priority: 7,
    create_sql: `
      CREATE TABLE deployment_approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        system_registration_id INTEGER REFERENCES system_registrations(id),
        approver_id UUID REFERENCES timbel_users(id),
        infrastructure_review TEXT,
        resource_allocation_plan TEXT,
        deployment_schedule TIMESTAMP,
        risk_assessment TEXT,
        rollback_plan TEXT,
        approval_status VARCHAR DEFAULT 'pending', -- pending, approved, rejected, conditional
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_deployment_approvals_system_registration_id ON deployment_approvals(system_registration_id);
    `
  },
  
  deployments: {
    exists: false,
    description: '실제 배포 수행 기록',
    priority: 8,
    create_sql: `
      CREATE TABLE deployments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deployment_approval_id UUID REFERENCES deployment_approvals(id),
        deployed_by UUID REFERENCES timbel_users(id),
        deployment_environment VARCHAR DEFAULT 'production',
        deployment_method VARCHAR DEFAULT 'automated', -- manual, automated, blue_green, rolling
        deployment_logs TEXT,
        infrastructure_config JSONB DEFAULT '{}',
        monitoring_setup JSONB DEFAULT '{}',
        deployment_status VARCHAR DEFAULT 'in_progress', -- in_progress, completed, failed, rolled_back
        started_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX idx_deployments_deployment_approval_id ON deployments(deployment_approval_id);
      CREATE INDEX idx_deployments_status ON deployments(deployment_status);
    `
  }
};

async function validateCompleteWorkflowSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 완전한 워크플로우 스키마 검증 시작...\n');
    
    // [advice from AI] 1. 기존 테이블 존재 확인
    console.log('📋 기존 테이블 존재 확인:');
    
    for (const [tableName, tableInfo] of Object.entries(requiredTables)) {
      try {
        const tableCheck = await client.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        `, [tableName]);
        
        if (tableCheck.rows[0].count > 0) {
          tableInfo.exists = true;
          const dataCount = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
          console.log(`   ✅ ${tableName}: 존재 (${dataCount.rows[0].count}개 레코드) - ${tableInfo.description}`);
        } else {
          console.log(`   ❌ ${tableName}: 없음 - ${tableInfo.description}`);
        }
      } catch (error) {
        console.log(`   ❌ ${tableName}: 조회 실패 - ${error.message}`);
      }
    }
    
    // [advice from AI] 2. 누락된 테이블 생성
    console.log('\n🔧 누락된 테이블 생성:');
    
    const missingTables = Object.entries(requiredTables)
      .filter(([_, tableInfo]) => !tableInfo.exists && tableInfo.create_sql)
      .sort((a, b) => a[1].priority - b[1].priority);
    
    if (missingTables.length === 0) {
      console.log('   ✅ 모든 필요한 테이블이 존재합니다.');
    } else {
      for (const [tableName, tableInfo] of missingTables) {
        try {
          console.log(`   🔨 ${tableName} 테이블 생성 중...`);
          await client.query(tableInfo.create_sql);
          console.log(`   ✅ ${tableName} 테이블 생성 완료 - ${tableInfo.description}`);
        } catch (error) {
          console.log(`   ❌ ${tableName} 테이블 생성 실패: ${error.message}`);
        }
      }
    }
    
    // [advice from AI] 3. 프로젝트 상태 enum 값 확인 및 업데이트
    console.log('\n📋 프로젝트 상태 값 검증:');
    
    const expectedStatuses = [
      'draft', 'pending_approval', 'po_approved', 'pe_assigned', 
      'qa_requested', 'qa_approved', 'po_final_approved', 
      'deployment_requested', 'deployment_approved', 'deployed', 
      'operational', 'cancelled', 'suspended'
    ];
    
    // 현재 사용 중인 상태 값 확인
    try {
      const statusResult = await client.query(`
        SELECT DISTINCT project_status 
        FROM projects 
        WHERE project_status IS NOT NULL
      `);
      
      const currentStatuses = statusResult.rows.map(row => row.project_status);
      console.log(`   📊 현재 사용 중인 상태: ${currentStatuses.join(', ')}`);
      console.log(`   📊 필요한 상태: ${expectedStatuses.join(', ')}`);
      
      const missingStatuses = expectedStatuses.filter(status => !currentStatuses.includes(status));
      if (missingStatuses.length > 0) {
        console.log(`   ⚠️ 아직 사용되지 않은 상태: ${missingStatuses.join(', ')}`);
      }
    } catch (error) {
      console.log(`   ❌ 상태 값 확인 실패: ${error.message}`);
    }
    
    // [advice from AI] 4. 권한 매트릭스 검증
    console.log('\n🔐 권한 시스템 검증:');
    
    const roleCheck = await client.query(`
      SELECT DISTINCT role_type 
      FROM timbel_users 
      WHERE role_type IS NOT NULL
    `);
    
    const currentRoles = roleCheck.rows.map(row => row.role_type);
    const expectedRoles = ['admin', 'executive', 'po', 'pe', 'qa', 'operations'];
    
    console.log(`   📊 현재 역할: ${currentRoles.join(', ')}`);
    console.log(`   📊 필요한 역할: ${expectedRoles.join(', ')}`);
    
    const missingRoles = expectedRoles.filter(role => !currentRoles.includes(role));
    if (missingRoles.length > 0) {
      console.log(`   ⚠️ 누락된 역할: ${missingRoles.join(', ')}`);
    }
    
    // [advice from AI] 5. 워크플로우 완성도 분석
    console.log('\n📈 워크플로우 완성도 분석:');
    
    await analyzeWorkflowCompleteness(client);
    
    console.log('\n✅ 완전한 워크플로우 스키마 검증 완료');
    
  } catch (error) {
    console.error('❌ 스키마 검증 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// [advice from AI] 워크플로우 완성도 분석
async function analyzeWorkflowCompleteness(client) {
  try {
    const completenessQuery = `
      SELECT 
        p.id,
        p.name,
        p.project_status,
        p.approval_status,
        CASE WHEN pa.id IS NOT NULL THEN 1 ELSE 0 END as has_po_approval,
        CASE WHEN wg.id IS NOT NULL THEN 1 ELSE 0 END as has_work_groups,
        CASE WHEN pwa.id IS NOT NULL THEN 1 ELSE 0 END as has_pe_assignment,
        CASE WHEN pcr.id IS NOT NULL THEN 1 ELSE 0 END as has_completion_report,
        CASE WHEN qqa.id IS NOT NULL THEN 1 ELSE 0 END as has_qa_review,
        CASE WHEN pca.id IS NOT NULL THEN 1 ELSE 0 END as has_completion_approval,
        CASE WHEN sr.id IS NOT NULL THEN 1 ELSE 0 END as has_system_registration,
        CASE WHEN da.id IS NOT NULL THEN 1 ELSE 0 END as has_deployment_approval,
        CASE WHEN d.id IS NOT NULL THEN 1 ELSE 0 END as has_deployment
      FROM projects p
      LEFT JOIN project_approvals pa ON p.id = pa.project_id
      LEFT JOIN work_groups wg ON p.id = wg.project_id
      LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
      LEFT JOIN project_completion_reports pcr ON p.id = pcr.project_id
      LEFT JOIN qc_qa_requests qqa ON p.id = qqa.project_id
      LEFT JOIN project_completion_approvals pca ON p.id = pca.project_id
      LEFT JOIN system_registrations sr ON p.id = sr.project_id
      LEFT JOIN deployment_approvals da ON sr.id = da.system_registration_id
      LEFT JOIN deployments d ON da.id = d.deployment_approval_id
      ORDER BY p.created_at DESC
      LIMIT 5
    `;
    
    const result = await client.query(completenessQuery);
    
    if (result.rows.length === 0) {
      console.log('   📭 프로젝트 데이터 없음');
      return;
    }
    
    result.rows.forEach(project => {
      const completionSteps = [
        project.has_po_approval,
        project.has_work_groups,
        project.has_pe_assignment,
        project.has_completion_report,
        project.has_qa_review,
        project.has_completion_approval,
        project.has_system_registration,
        project.has_deployment_approval,
        project.has_deployment
      ];
      
      const completedSteps = completionSteps.filter(step => step === 1).length;
      const totalSteps = completionSteps.length;
      const completionRate = Math.round((completedSteps / totalSteps) * 100);
      
      console.log(`   📊 ${project.name}: ${completionRate}% 완료 (${completedSteps}/${totalSteps} 단계)`);
      console.log(`      현재 상태: ${project.project_status}/${project.approval_status}`);
      
      const stepNames = ['PO승인', '작업그룹', 'PE할당', '완료보고', 'QA검토', '최종승인', '배포요청', '배포승인', '배포수행'];
      const missingSteps = stepNames.filter((_, index) => completionSteps[index] === 0);
      if (missingSteps.length > 0) {
        console.log(`      누락 단계: ${missingSteps.join(', ')}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.log('   ❌ 완성도 분석 실패:', error.message);
  }
}

// [advice from AI] 실행
if (require.main === module) {
  validateCompleteWorkflowSchema()
    .then(() => {
      console.log('\n🎉 완전한 워크플로우 스키마 검증 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 워크플로우 스키마 검증 실패:', error);
      process.exit(1);
    });
}

module.exports = { validateCompleteWorkflowSchema };
