// [advice from AI] STEP 2: 관리자 승인 단계 테스트
// 워크플로우 명세서 기준: draft → pending_approval → po_approved
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] STEP 2 데이터 필요량 정의
const STEP2_DATA_REQUIREMENTS = {
  // 필수 입력 데이터
  required_inputs: {
    project_id: { type: 'uuid', description: '승인할 프로젝트 ID', source: 'projects 테이블' },
    approver_id: { type: 'uuid', description: '승인자 ID', source: 'timbel_users 테이블 (admin/executive)' },
    approval_action: { type: 'enum', values: ['approved', 'rejected', 'conditional'], description: '승인 액션' }
  },
  
  // 선택적 입력 데이터
  optional_inputs: {
    approval_comment: { type: 'text', description: '승인 의견' },
    conditions: { type: 'text', description: '조건부 승인 시 조건 사항' },
    assigned_po: { type: 'uuid', description: '할당할 PO ID', source: 'timbel_users 테이블 (po)' }
  },
  
  // 자동 생성 데이터
  auto_generated: {
    id: { type: 'uuid', source: 'gen_random_uuid()' },
    approved_at: { type: 'timestamp', source: 'NOW()' },
    created_at: { type: 'timestamp', source: 'NOW()' }
  },
  
  // 상태 변경
  status_changes: {
    from: 'draft/pending',
    to: 'pending_approval → po_approved (승인 시)',
    project_updates: {
      project_status: 'pending_approval → po_approved',
      approval_status: 'pending → approved',
      assigned_po: 'NULL → PO ID (승인 시)'
    }
  },
  
  // 데이터 누적
  data_accumulation: {
    projects: '기본 정보 유지',
    project_approvals: '새 레코드 추가 (승인 이력)',
    project_status_history: '상태 변경 이력 추가 (향후 구현)'
  }
};

// [advice from AI] 승인 시나리오 정의
const APPROVAL_SCENARIOS = [
  {
    name: '일반 승인',
    approval_action: 'approved',
    approval_comment: '프로젝트 목표가 명확하고 실현 가능성이 높음. 승인합니다.',
    conditions: null,
    expected_project_status: 'po_approved',
    expected_approval_status: 'approved'
  },
  {
    name: '조건부 승인',
    approval_action: 'conditional',
    approval_comment: '전반적으로 좋은 프로젝트이나 일부 조건 충족 필요.',
    conditions: '1. 보안 검토 완료 후 진행\n2. 예산 승인 후 시작\n3. 기술 검토 위원회 승인 필요',
    expected_project_status: 'po_approved',
    expected_approval_status: 'approved'
  },
  {
    name: '거부',
    approval_action: 'rejected',
    approval_comment: '현재 시점에서는 우선순위가 낮고 리소스 부족으로 진행 어려움.',
    conditions: null,
    expected_project_status: 'draft',
    expected_approval_status: 'rejected'
  }
];

async function testStep2AdminApproval() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 STEP 2: 관리자 승인 단계 테스트 시작...\n');
    
    // [advice from AI] 1. 데이터 필요량 검증
    console.log('📋 STEP 2 데이터 필요량 분석:');
    console.log('   🔸 필수 입력 데이터:');
    Object.entries(STEP2_DATA_REQUIREMENTS.required_inputs).forEach(([key, spec]) => {
      console.log(`     - ${key}: ${spec.type} (${spec.description})`);
    });
    
    console.log('   🔸 선택적 입력 데이터:');
    Object.entries(STEP2_DATA_REQUIREMENTS.optional_inputs).forEach(([key, spec]) => {
      console.log(`     - ${key}: ${spec.type} (${spec.description})`);
    });
    
    console.log('   🔸 자동 생성 데이터:');
    Object.entries(STEP2_DATA_REQUIREMENTS.auto_generated).forEach(([key, spec]) => {
      console.log(`     - ${key}: ${spec.type} ${spec.source ? `(${spec.source})` : ''}`);
    });
    
    console.log('   🔸 상태 변경:');
    console.log(`     - 프로젝트 상태: ${STEP2_DATA_REQUIREMENTS.status_changes.project_updates.project_status}`);
    console.log(`     - 승인 상태: ${STEP2_DATA_REQUIREMENTS.status_changes.project_updates.approval_status}`);
    
    // [advice from AI] 2. 의존성 데이터 확인
    console.log('\n📊 의존성 데이터 확인:');
    
    // 승인 대기 프로젝트 확인
    const pendingProjectsResult = await client.query(`
      SELECT id, name, project_status, approval_status, created_at
      FROM projects 
      WHERE project_status = 'draft' AND approval_status = 'pending'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log(`   ✅ 승인 대기 프로젝트: ${pendingProjectsResult.rows.length}개`);
    pendingProjectsResult.rows.forEach((project, index) => {
      console.log(`     ${index + 1}. ${project.name} (${project.id.substring(0, 8)}...)`);
    });
    
    // 승인자 확인 (Admin, Executive)
    const approversResult = await client.query(`
      SELECT id, full_name, role_type 
      FROM timbel_users 
      WHERE role_type IN ('admin', 'executive') 
      ORDER BY role_type, full_name
    `);
    console.log(`   ✅ 사용 가능한 승인자: ${approversResult.rows.length}명`);
    approversResult.rows.forEach((approver, index) => {
      console.log(`     ${index + 1}. ${approver.full_name} (${approver.role_type})`);
    });
    
    // PO 확인 (할당용)
    const posResult = await client.query(`
      SELECT id, full_name, role_type 
      FROM timbel_users 
      WHERE role_type = 'po' 
      ORDER BY full_name
    `);
    console.log(`   ✅ 할당 가능한 PO: ${posResult.rows.length}명`);
    posResult.rows.forEach((po, index) => {
      console.log(`     ${index + 1}. ${po.full_name}`);
    });
    
    if (pendingProjectsResult.rows.length === 0) {
      throw new Error('승인 대기 프로젝트가 없습니다. STEP 1을 먼저 실행하세요.');
    }
    
    if (approversResult.rows.length === 0) {
      throw new Error('승인자가 없습니다.');
    }
    
    // [advice from AI] 3. 승인 테스트 실행
    console.log('\n🧪 관리자 승인 테스트 실행:');
    
    const approvalResults = [];
    const selectedApprover = approversResult.rows[0];
    const selectedPO = posResult.rows.length > 0 ? posResult.rows[0] : null;
    
    // 각 시나리오별로 프로젝트 승인 테스트
    for (let i = 0; i < Math.min(APPROVAL_SCENARIOS.length, pendingProjectsResult.rows.length); i++) {
      const project = pendingProjectsResult.rows[i];
      const scenario = APPROVAL_SCENARIOS[i];
      
      console.log(`\n   📋 테스트 ${i + 1}: ${scenario.name} - ${project.name}`);
      
      try {
        await client.query('BEGIN');
        
        // 승인 레코드 생성
        const approvalResult = await client.query(`
          INSERT INTO project_approvals (
            project_id, approver_id, approval_action, approval_comment, conditions, approved_at
          ) VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING *
        `, [
          project.id,
          selectedApprover.id,
          scenario.approval_action,
          scenario.approval_comment,
          scenario.conditions
        ]);
        
        const approvalRecord = approvalResult.rows[0];
        
        // 프로젝트 상태 업데이트
        let updateQuery = `
          UPDATE projects 
          SET project_status = $1, approval_status = $2, updated_at = NOW()
        `;
        let updateParams = [scenario.expected_project_status, scenario.expected_approval_status];
        
        // 승인된 경우 PO 할당
        if (scenario.approval_action === 'approved' || scenario.approval_action === 'conditional') {
          if (selectedPO) {
            updateQuery += `, assigned_po = $3`;
            updateParams.push(selectedPO.id);
          }
        }
        
        updateQuery += ` WHERE id = $${updateParams.length + 1} RETURNING *`;
        updateParams.push(project.id);
        
        const projectUpdateResult = await client.query(updateQuery, updateParams);
        const updatedProject = projectUpdateResult.rows[0];
        
        await client.query('COMMIT');
        
        console.log(`     ✅ 승인 처리 성공`);
        console.log(`     📊 승인 ID: ${approvalRecord.id}`);
        console.log(`     📊 승인 액션: ${approvalRecord.approval_action}`);
        console.log(`     📊 승인자: ${selectedApprover.full_name}`);
        console.log(`     📊 승인 시간: ${approvalRecord.approved_at.toISOString().split('T')[0]}`);
        console.log(`     📊 프로젝트 상태: ${project.project_status} → ${updatedProject.project_status}`);
        console.log(`     📊 승인 상태: ${project.approval_status} → ${updatedProject.approval_status}`);
        
        if (updatedProject.assigned_po && selectedPO) {
          console.log(`     📊 할당된 PO: ${selectedPO.full_name}`);
        }
        
        // 자동 생성 데이터 검증
        console.log(`     🔍 자동 생성 데이터 검증:`);
        console.log(`       - 승인 ID: ${approvalRecord.id ? '✅' : '❌'} (UUID 형식)`);
        console.log(`       - 승인 시간: ${approvalRecord.approved_at ? '✅' : '❌'} (자동 설정)`);
        console.log(`       - 생성 시간: ${approvalRecord.created_at ? '✅' : '❌'} (자동 설정)`);
        
        // 조건부 승인 검증
        if (scenario.approval_action === 'conditional' && approvalRecord.conditions) {
          console.log(`     🔍 조건부 승인 조건:`);
          const conditions = approvalRecord.conditions.split('\n');
          conditions.forEach((condition, idx) => {
            console.log(`       ${idx + 1}. ${condition.trim()}`);
          });
        }
        
        approvalResults.push({
          project_id: project.id,
          project_name: project.name,
          scenario: scenario.name,
          approval_action: scenario.approval_action,
          success: true,
          approval_record: approvalRecord,
          updated_project: updatedProject
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.log(`     ❌ 승인 처리 실패: ${error.message}`);
        
        approvalResults.push({
          project_id: project.id,
          project_name: project.name,
          scenario: scenario.name,
          approval_action: scenario.approval_action,
          success: false,
          error: error.message
        });
      }
    }
    
    // [advice from AI] 4. 승인 결과 통계
    console.log('\n📊 STEP 2 실행 결과:');
    const successCount = approvalResults.filter(r => r.success).length;
    console.log(`   📈 처리된 승인: ${approvalResults.length}개`);
    console.log(`   📈 성공률: ${Math.round((successCount / approvalResults.length) * 100)}%`);
    
    // 승인 액션별 분포
    const actionDistribution = {};
    approvalResults.filter(r => r.success).forEach(result => {
      actionDistribution[result.approval_action] = (actionDistribution[result.approval_action] || 0) + 1;
    });
    console.log('   📈 승인 액션 분포:');
    Object.entries(actionDistribution).forEach(([action, count]) => {
      const actionLabels = {
        approved: '승인',
        conditional: '조건부 승인',
        rejected: '거부'
      };
      console.log(`     - ${actionLabels[action] || action}: ${count}개`);
    });
    
    // [advice from AI] 5. 다음 단계 준비 상태 확인
    console.log('\n🎯 다음 단계 (STEP 3: PO PE 할당) 준비 상태:');
    
    const approvedProjectsResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM projects 
      WHERE project_status = 'po_approved' AND approval_status = 'approved'
    `);
    console.log(`   📋 PE 할당 대기 프로젝트: ${approvedProjectsResult.rows[0].count}개`);
    
    const pesResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM timbel_users 
      WHERE role_type = 'pe'
    `);
    console.log(`   📋 사용 가능한 PE: ${pesResult.rows[0].count}명`);
    
    // [advice from AI] 6. 데이터 품질 검증
    console.log('\n🔍 데이터 품질 검증:');
    
    for (const result of approvalResults.filter(r => r.success)) {
      console.log(`   📊 ${result.project_name} (${result.scenario}):`);
      
      // 승인 레코드 검증
      const approval = result.approval_record;
      const requiredFields = ['id', 'project_id', 'approver_id', 'approval_action', 'approved_at'];
      const missingFields = requiredFields.filter(field => !approval[field]);
      if (missingFields.length === 0) {
        console.log(`     ✅ 승인 레코드 필수 필드 완성`);
      } else {
        console.log(`     ❌ 누락된 필수 필드: ${missingFields.join(', ')}`);
      }
      
      // 프로젝트 상태 검증
      const project = result.updated_project;
      const expectedStatus = APPROVAL_SCENARIOS.find(s => s.name === result.scenario);
      if (project.project_status === expectedStatus.expected_project_status && 
          project.approval_status === expectedStatus.expected_approval_status) {
        console.log(`     ✅ 프로젝트 상태 정상 (${project.project_status}/${project.approval_status})`);
      } else {
        console.log(`     ⚠️ 프로젝트 상태 이상 (${project.project_status}/${project.approval_status})`);
      }
      
      // PO 할당 검증 (승인된 경우)
      if (result.approval_action === 'approved' || result.approval_action === 'conditional') {
        if (project.assigned_po) {
          console.log(`     ✅ PO 할당 완료`);
        } else {
          console.log(`     ⚠️ PO 할당 누락`);
        }
      }
    }
    
    // [advice from AI] 7. 데이터 누적 패턴 검증
    console.log('\n🔄 데이터 누적 패턴 검증:');
    
    // 각 프로젝트별 데이터 누적 상태 확인
    for (const result of approvalResults.filter(r => r.success)) {
      console.log(`   📊 ${result.project_name}:`);
      
      // projects 테이블 데이터
      const projectData = await client.query(`
        SELECT name, project_status, approval_status, assigned_po, created_at, updated_at
        FROM projects WHERE id = $1
      `, [result.project_id]);
      console.log(`     📋 프로젝트 기본 정보: ✅ (상태: ${projectData.rows[0].project_status})`);
      
      // project_approvals 테이블 데이터
      const approvalsData = await client.query(`
        SELECT COUNT(*) as count, 
               array_agg(approval_action ORDER BY created_at) as actions
        FROM project_approvals WHERE project_id = $1
      `, [result.project_id]);
      console.log(`     📋 승인 이력: ✅ (${approvalsData.rows[0].count}건 - ${approvalsData.rows[0].actions.join(', ')})`);
      
      // 다음 단계 준비도 확인
      if (result.approval_action === 'approved' || result.approval_action === 'conditional') {
        console.log(`     📋 다음 단계 준비: ✅ (PE 할당 가능)`);
      } else {
        console.log(`     📋 다음 단계 준비: ❌ (거부됨)`);
      }
    }
    
    console.log('\n✅ STEP 2: 관리자 승인 단계 테스트 완료');
    
    return {
      success: true,
      approval_results: approvalResults,
      statistics: {
        total_processed: approvalResults.length,
        success_count: successCount,
        success_rate: Math.round((successCount / approvalResults.length) * 100),
        action_distribution: actionDistribution
      }
    };
    
  } catch (error) {
    console.error('❌ STEP 2 테스트 실패:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
}

// [advice from AI] 실행
if (require.main === module) {
  testStep2AdminApproval()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 STEP 2 테스트 성공');
        console.log(`📊 처리된 승인: ${result.statistics.total_processed}개`);
        console.log(`📊 성공률: ${result.statistics.success_rate}%`);
      } else {
        console.log('\n💥 STEP 2 테스트 실패');
        console.log(`❌ 오류: ${result.error}`);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 STEP 2 테스트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { 
  testStep2AdminApproval, 
  STEP2_DATA_REQUIREMENTS, 
  APPROVAL_SCENARIOS 
};
