// [advice from AI] 프로젝트 워크플로우 데이터 누적 구조 분석
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] 프로젝트 워크플로우 단계별 데이터 구조
const workflowStages = {
  1: {
    stage: 'project_creation',
    actor: 'PO/Admin',
    description: '프로젝트 생성',
    tables: ['projects'],
    data_added: [
      'name', 'domain_id', 'project_overview', 'target_system_name',
      'urgency_level', 'deadline', 'is_urgent_development', 'urgent_reason',
      'expected_completion_hours', 'metadata (similar_systems, work_groups)'
    ]
  },
  2: {
    stage: 'admin_approval',
    actor: 'Admin',
    description: '최고운영자 승인',
    tables: ['project_approvals'],
    data_added: [
      'project_id', 'approver_id', 'approval_action', 'approval_comment',
      'approved_at', 'projects.status -> active', 'projects.assigned_po'
    ]
  },
  3: {
    stage: 'po_assignment',
    actor: 'PO',
    description: 'PO 할당 및 작업 계획',
    tables: ['work_groups', 'project_documents'],
    data_added: [
      'work_groups (name, description, estimated_hours)',
      'project_documents (requirements, specifications)',
      'projects.metadata (detailed_requirements)'
    ]
  },
  4: {
    stage: 'pe_assignment',
    actor: 'PO',
    description: 'PE 할당',
    tables: ['project_work_assignments'],
    data_added: [
      'project_id', 'work_group_id', 'assigned_pe_id', 'assignment_date',
      'estimated_hours', 'assignment_notes'
    ]
  },
  5: {
    stage: 'development_work',
    actor: 'PE',
    description: '개발 작업 수행',
    tables: ['project_completion_reports', 'project_repositories'],
    data_added: [
      'completion_reports (progress, technical_notes, challenges)',
      'project_repositories (repository_url, branch_name, commit_hash)',
      'work_groups.status -> completed'
    ]
  },
  6: {
    stage: 'qa_review',
    actor: 'QA',
    description: 'QC/QA 검토',
    tables: ['qc_qa_requests'],
    data_added: [
      'project_id', 'requested_by', 'qc_type', 'priority',
      'requirements_document', 'test_scenarios', 'quality_criteria',
      'qc_feedback', 'qa_feedback', 'overall_score'
    ]
  },
  7: {
    stage: 'deployment_request',
    actor: 'PO',
    description: 'PO 배포 요청',
    tables: ['system_registrations'],
    data_added: [
      'project_id', 'system_name', 'system_description', 'deployment_environment',
      'resource_requirements', 'business_justification', 'expected_benefits',
      'risk_assessment', 'rollback_plan'
    ]
  },
  8: {
    stage: 'operations_deployment',
    actor: 'Operations',
    description: '운영팀 배포 실행',
    tables: ['build_failures', 'issue_reports', 'systems'],
    data_added: [
      'jenkins_build_logs', 'deployment_status', 'infrastructure_config',
      'monitoring_setup', 'build_failures (if any)', 'issue_reports (if any)',
      'systems (final catalog entry)'
    ]
  }
};

async function analyzeProjectWorkflowData() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 프로젝트 워크플로우 데이터 누적 구조 분석...\n');
    
    // [advice from AI] 1. 각 단계별 테이블 존재 확인
    console.log('📋 워크플로우 단계별 테이블 존재 확인:');
    
    for (const [stageNum, stage] of Object.entries(workflowStages)) {
      console.log(`\n${stageNum}. ${stage.description} (${stage.actor})`);
      console.log(`   관련 테이블: ${stage.tables.join(', ')}`);
      
      // 각 테이블 존재 확인
      for (const tableName of stage.tables) {
        try {
          const tableCheck = await client.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = $1
          `, [tableName]);
          
          if (tableCheck.rows[0].count > 0) {
            // 데이터 개수 확인
            const dataCount = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            console.log(`   ✅ ${tableName}: 존재 (${dataCount.rows[0].count}개 레코드)`);
          } else {
            console.log(`   ❌ ${tableName}: 테이블 없음`);
          }
        } catch (error) {
          console.log(`   ❌ ${tableName}: 조회 실패 - ${error.message}`);
        }
      }
      
      console.log(`   📝 추가되는 데이터: ${stage.data_added.join(', ')}`);
    }
    
    // [advice from AI] 2. 실제 프로젝트 데이터로 워크플로우 추적
    console.log('\n\n🔍 실제 프로젝트 데이터 워크플로우 추적:');
    
    const projectsResult = await client.query(`
      SELECT id, name, project_status, approval_status, created_at
      FROM projects 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    for (const project of projectsResult.rows) {
      console.log(`\n📊 프로젝트: ${project.name} (${project.project_status}/${project.approval_status})`);
      console.log(`   생성일: ${project.created_at ? project.created_at.toISOString().split('T')[0] : '없음'}`);
      
      // 각 단계별 데이터 존재 확인
      await checkStageData(client, project.id, project.name);
    }
    
    // [advice from AI] 3. 데이터 누적 패턴 분석
    console.log('\n\n📈 데이터 누적 패턴 분석:');
    await analyzeDataAccumulationPattern(client);
    
    // [advice from AI] 4. 누락된 워크플로우 단계 식별
    console.log('\n\n⚠️ 워크플로우 완성도 분석:');
    await analyzeWorkflowCompleteness(client);
    
  } catch (error) {
    console.error('❌ 워크플로우 분석 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// [advice from AI] 특정 프로젝트의 각 단계별 데이터 확인
async function checkStageData(client, projectId, projectName) {
  const stages = [
    {
      name: '승인 기록',
      query: 'SELECT COUNT(*) as count FROM project_approvals WHERE project_id = $1',
      params: [projectId]
    },
    {
      name: '작업 그룹',
      query: 'SELECT COUNT(*) as count FROM work_groups WHERE project_id = $1',
      params: [projectId]
    },
    {
      name: 'PE 할당',
      query: 'SELECT COUNT(*) as count FROM project_work_assignments WHERE project_id = $1',
      params: [projectId]
    },
    {
      name: '완료 보고서',
      query: 'SELECT COUNT(*) as count FROM project_completion_reports WHERE project_id = $1',
      params: [projectId]
    },
    {
      name: 'QA 요청',
      query: 'SELECT COUNT(*) as count FROM qc_qa_requests WHERE project_id = $1',
      params: [projectId]
    },
    {
      name: '시스템 등록',
      query: 'SELECT COUNT(*) as count FROM system_registrations WHERE project_id = $1',
      params: [projectId]
    },
    {
      name: '빌드 실패',
      query: 'SELECT COUNT(*) as count FROM build_failures WHERE project_id = $1',
      params: [projectId]
    }
  ];
  
  for (const stage of stages) {
    try {
      const result = await client.query(stage.query, stage.params);
      const count = result.rows[0].count;
      const status = count > 0 ? '✅' : '⭕';
      console.log(`   ${status} ${stage.name}: ${count}개`);
    } catch (error) {
      console.log(`   ❌ ${stage.name}: 조회 실패`);
    }
  }
}

// [advice from AI] 데이터 누적 패턴 분석
async function analyzeDataAccumulationPattern(client) {
  try {
    const patternQuery = `
      SELECT 
        'projects' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN project_status = 'completed' THEN 1 END) as completed_count
      FROM projects
      
      UNION ALL
      
      SELECT 
        'project_approvals' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN approval_action = 'approved' THEN 1 END) as approved_count,
        0 as completed_count
      FROM project_approvals
      
      UNION ALL
      
      SELECT 
        'work_groups' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count
      FROM work_groups
      
      UNION ALL
      
      SELECT 
        'qc_qa_requests' as table_name,
        COUNT(*) as total_records,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        0 as other_count
      FROM qc_qa_requests
    `;
    
    const result = await client.query(patternQuery);
    
    result.rows.forEach(row => {
      console.log(`   📊 ${row.table_name}: ${row.total_records}개 레코드`);
      if (row.approved_count !== undefined) {
        console.log(`      승인: ${row.approved_count}개, 완료: ${row.completed_count}개`);
      }
    });
    
  } catch (error) {
    console.log('   ❌ 패턴 분석 실패:', error.message);
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
        CASE WHEN pa.id IS NOT NULL THEN 1 ELSE 0 END as has_approval,
        CASE WHEN wg.id IS NOT NULL THEN 1 ELSE 0 END as has_work_groups,
        CASE WHEN pwa.id IS NOT NULL THEN 1 ELSE 0 END as has_pe_assignment,
        CASE WHEN pcr.id IS NOT NULL THEN 1 ELSE 0 END as has_completion_report,
        CASE WHEN qqa.id IS NOT NULL THEN 1 ELSE 0 END as has_qa_review,
        CASE WHEN sr.id IS NOT NULL THEN 1 ELSE 0 END as has_system_registration
      FROM projects p
      LEFT JOIN project_approvals pa ON p.id = pa.project_id
      LEFT JOIN work_groups wg ON p.id = wg.project_id
      LEFT JOIN project_work_assignments pwa ON p.id = pwa.project_id
      LEFT JOIN project_completion_reports pcr ON p.id = pcr.project_id
      LEFT JOIN qc_qa_requests qqa ON p.id = qqa.project_id
      LEFT JOIN system_registrations sr ON p.id = sr.project_id
      ORDER BY p.created_at DESC
      LIMIT 5
    `;
    
    const result = await client.query(completenessQuery);
    
    result.rows.forEach(project => {
      const completionSteps = [
        project.has_approval,
        project.has_work_groups,
        project.has_pe_assignment,
        project.has_completion_report,
        project.has_qa_review,
        project.has_system_registration
      ];
      
      const completedSteps = completionSteps.filter(step => step === 1).length;
      const totalSteps = completionSteps.length;
      const completionRate = Math.round((completedSteps / totalSteps) * 100);
      
      console.log(`   📊 ${project.name}: ${completionRate}% 완료 (${completedSteps}/${totalSteps} 단계)`);
      console.log(`      상태: ${project.project_status}/${project.approval_status}`);
      
      const stepNames = ['승인', '작업그룹', 'PE할당', '완료보고', 'QA검토', '시스템등록'];
      const missingSteps = stepNames.filter((_, index) => completionSteps[index] === 0);
      if (missingSteps.length > 0) {
        console.log(`      누락: ${missingSteps.join(', ')}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.log('   ❌ 완성도 분석 실패:', error.message);
  }
}

// [advice from AI] 실행
if (require.main === module) {
  analyzeProjectWorkflowData()
    .then(() => {
      console.log('\n🎉 워크플로우 데이터 분석 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 워크플로우 데이터 분석 실패:', error);
      process.exit(1);
    });
}

module.exports = { analyzeProjectWorkflowData };
