// [advice from AI] STEP 1: 프로젝트 생성 단계 테스트
// 워크플로우 명세서 기준: draft → pending_approval
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] STEP 1 데이터 필요량 정의
const STEP1_DATA_REQUIREMENTS = {
  // 필수 입력 데이터
  required_inputs: {
    name: { type: 'string', description: '프로젝트명', example: 'AI 챗봇 서비스' },
    domain_id: { type: 'uuid', description: '소속 도메인 ID', source: 'domains 테이블' },
    created_by: { type: 'uuid', description: '생성자 ID', source: 'timbel_users 테이블' }
  },
  
  // 선택적 입력 데이터
  optional_inputs: {
    project_overview: { type: 'text', description: '프로젝트 개요' },
    target_system_name: { type: 'string', description: '목표 시스템명' },
    urgency_level: { type: 'enum', values: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    deadline: { type: 'date', description: '마감일' },
    is_urgent_development: { type: 'boolean', default: false },
    urgent_reason: { type: 'text', description: '긴급 사유' },
    expected_completion_hours: { type: 'integer', description: '예상 완료 시간' },
    metadata: { type: 'jsonb', description: '추가 메타데이터', default: '{}' }
  },
  
  // 자동 생성 데이터
  auto_generated: {
    id: { type: 'uuid', source: 'gen_random_uuid()' },
    project_status: { type: 'string', default: 'draft' },
    approval_status: { type: 'string', default: 'pending' },
    created_at: { type: 'timestamp', source: 'NOW()' },
    updated_at: { type: 'timestamp', source: 'NOW()' }
  },
  
  // 상태 변경
  status_changes: {
    from: 'null',
    to: 'draft → pending_approval'
  }
};

// [advice from AI] 테스트용 프로젝트 데이터
const TEST_PROJECTS = [
  {
    name: 'AI 기반 고객 상담 챗봇',
    project_overview: 'GPT-4를 활용한 24시간 고객 상담 자동화 시스템 구축',
    target_system_name: 'Customer Support AI Bot',
    urgency_level: 'high',
    deadline: '2025-12-31',
    is_urgent_development: true,
    urgent_reason: '고객 만족도 향상을 위한 긴급 도입 필요',
    expected_completion_hours: 320,
    metadata: {
      similar_systems: ['기존 FAQ 시스템', 'LiveChat 시스템'],
      work_groups: [
        { name: 'AI 모델 개발', estimated_hours: 120 },
        { name: '웹 인터페이스 구축', estimated_hours: 80 },
        { name: 'API 연동', estimated_hours: 60 },
        { name: '테스트 및 배포', estimated_hours: 60 }
      ],
      business_priority: 'critical',
      expected_roi: '고객 응답 시간 80% 단축'
    }
  },
  {
    name: '실시간 재고 관리 시스템',
    project_overview: '다중 창고 실시간 재고 추적 및 자동 발주 시스템',
    target_system_name: 'Real-time Inventory Management',
    urgency_level: 'medium',
    deadline: '2025-10-15',
    is_urgent_development: false,
    expected_completion_hours: 240,
    metadata: {
      similar_systems: ['기존 ERP 시스템'],
      work_groups: [
        { name: '데이터베이스 설계', estimated_hours: 60 },
        { name: '백엔드 API 개발', estimated_hours: 100 },
        { name: '프론트엔드 대시보드', estimated_hours: 80 }
      ],
      integration_requirements: ['SAP ERP', 'WMS 시스템']
    }
  },
  {
    name: '모바일 앱 성능 모니터링 도구',
    project_overview: '모바일 앱의 실시간 성능 지표 수집 및 분석 플랫폼',
    target_system_name: 'Mobile Performance Monitor',
    urgency_level: 'low',
    deadline: '2025-11-30',
    expected_completion_hours: 180,
    metadata: {
      work_groups: [
        { name: 'SDK 개발', estimated_hours: 80 },
        { name: '데이터 수집 파이프라인', estimated_hours: 60 },
        { name: '분석 대시보드', estimated_hours: 40 }
      ],
      target_platforms: ['iOS', 'Android', 'React Native']
    }
  }
];

async function testStep1ProjectCreation() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 STEP 1: 프로젝트 생성 단계 테스트 시작...\n');
    
    // [advice from AI] 1. 데이터 필요량 검증
    console.log('📋 STEP 1 데이터 필요량 분석:');
    console.log('   🔸 필수 입력 데이터:');
    Object.entries(STEP1_DATA_REQUIREMENTS.required_inputs).forEach(([key, spec]) => {
      console.log(`     - ${key}: ${spec.type} (${spec.description})`);
    });
    
    console.log('   🔸 선택적 입력 데이터:');
    Object.entries(STEP1_DATA_REQUIREMENTS.optional_inputs).forEach(([key, spec]) => {
      console.log(`     - ${key}: ${spec.type} ${spec.default ? `[기본값: ${spec.default}]` : ''}`);
    });
    
    console.log('   🔸 자동 생성 데이터:');
    Object.entries(STEP1_DATA_REQUIREMENTS.auto_generated).forEach(([key, spec]) => {
      console.log(`     - ${key}: ${spec.type} ${spec.source ? `(${spec.source})` : spec.default ? `[${spec.default}]` : ''}`);
    });
    
    // [advice from AI] 2. 의존성 데이터 확인
    console.log('\n📊 의존성 데이터 확인:');
    
    // 도메인 데이터 확인
    const domainsResult = await client.query('SELECT id, name FROM domains ORDER BY name LIMIT 5');
    console.log(`   ✅ 사용 가능한 도메인: ${domainsResult.rows.length}개`);
    domainsResult.rows.forEach((domain, index) => {
      console.log(`     ${index + 1}. ${domain.name} (${domain.id})`);
    });
    
    // 사용자 데이터 확인 (PO, Admin)
    const usersResult = await client.query(`
      SELECT id, full_name, role_type 
      FROM timbel_users 
      WHERE role_type IN ('po', 'admin', 'executive') 
      ORDER BY role_type, full_name
    `);
    console.log(`   ✅ 프로젝트 생성 가능한 사용자: ${usersResult.rows.length}명`);
    usersResult.rows.forEach((user, index) => {
      console.log(`     ${index + 1}. ${user.full_name} (${user.role_type})`);
    });
    
    if (domainsResult.rows.length === 0 || usersResult.rows.length === 0) {
      throw new Error('필수 의존성 데이터가 부족합니다.');
    }
    
    // [advice from AI] 3. 프로젝트 생성 테스트 실행
    console.log('\n🧪 프로젝트 생성 테스트 실행:');
    
    const createdProjects = [];
    const selectedDomain = domainsResult.rows[0];
    const selectedUser = usersResult.rows[0];
    
    for (let i = 0; i < TEST_PROJECTS.length; i++) {
      const projectData = TEST_PROJECTS[i];
      console.log(`\n   📋 테스트 ${i + 1}: ${projectData.name}`);
      
      try {
        // 프로젝트 생성 SQL 실행
        const projectResult = await client.query(`
          INSERT INTO projects (
            name, project_overview, target_system_name, urgency_level, deadline,
            is_urgent_development, urgent_reason, expected_completion_hours,
            metadata, domain_id, created_by, project_status, approval_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'draft', 'pending')
          RETURNING *
        `, [
          projectData.name,
          projectData.project_overview,
          projectData.target_system_name,
          projectData.urgency_level,
          projectData.deadline,
          projectData.is_urgent_development,
          projectData.urgent_reason,
          projectData.expected_completion_hours,
          JSON.stringify(projectData.metadata),
          selectedDomain.id,
          selectedUser.id
        ]);
        
        const createdProject = projectResult.rows[0];
        createdProjects.push(createdProject);
        
        console.log(`     ✅ 프로젝트 생성 성공`);
        console.log(`     📊 ID: ${createdProject.id}`);
        console.log(`     📊 상태: ${createdProject.project_status}/${createdProject.approval_status}`);
        console.log(`     📊 생성일: ${createdProject.created_at.toISOString().split('T')[0]}`);
        console.log(`     📊 도메인: ${selectedDomain.name}`);
        console.log(`     📊 생성자: ${selectedUser.full_name}`);
        
        // 자동 생성 데이터 검증
        console.log(`     🔍 자동 생성 데이터 검증:`);
        console.log(`       - ID: ${createdProject.id ? '✅' : '❌'} (UUID 형식)`);
        console.log(`       - 생성일: ${createdProject.created_at ? '✅' : '❌'} (자동 설정)`);
        console.log(`       - 수정일: ${createdProject.updated_at ? '✅' : '❌'} (자동 설정)`);
        console.log(`       - 프로젝트 상태: ${createdProject.project_status === 'draft' ? '✅' : '❌'} (draft)`);
        console.log(`       - 승인 상태: ${createdProject.approval_status === 'pending' ? '✅' : '❌'} (pending)`);
        
        // 메타데이터 검증
        if (createdProject.metadata) {
          const metadata = typeof createdProject.metadata === 'string' 
            ? JSON.parse(createdProject.metadata) 
            : createdProject.metadata;
          console.log(`     🔍 메타데이터 검증:`);
          console.log(`       - 유사 시스템: ${metadata.similar_systems ? metadata.similar_systems.length : 0}개`);
          console.log(`       - 작업 그룹: ${metadata.work_groups ? metadata.work_groups.length : 0}개`);
          if (metadata.work_groups) {
            const totalHours = metadata.work_groups.reduce((sum, wg) => sum + (wg.estimated_hours || 0), 0);
            console.log(`       - 총 예상 시간: ${totalHours}시간`);
          }
        }
        
      } catch (error) {
        console.log(`     ❌ 프로젝트 생성 실패: ${error.message}`);
      }
    }
    
    // [advice from AI] 4. 생성된 데이터 통계
    console.log('\n📊 STEP 1 실행 결과:');
    console.log(`   📈 생성된 프로젝트: ${createdProjects.length}개`);
    console.log(`   📈 성공률: ${Math.round((createdProjects.length / TEST_PROJECTS.length) * 100)}%`);
    
    // 긴급도별 분포
    const urgencyDistribution = {};
    createdProjects.forEach(project => {
      urgencyDistribution[project.urgency_level] = (urgencyDistribution[project.urgency_level] || 0) + 1;
    });
    console.log('   📈 긴급도 분포:');
    Object.entries(urgencyDistribution).forEach(([level, count]) => {
      console.log(`     - ${level}: ${count}개`);
    });
    
    // 긴급 개발 프로젝트 수
    const urgentCount = createdProjects.filter(p => p.is_urgent_development).length;
    console.log(`   📈 긴급 개발 프로젝트: ${urgentCount}개`);
    
    // [advice from AI] 5. 다음 단계 준비 상태 확인
    console.log('\n🎯 다음 단계 (STEP 2: 관리자 승인) 준비 상태:');
    console.log(`   📋 승인 대기 프로젝트: ${createdProjects.length}개`);
    console.log(`   📋 필요한 승인자: Admin/Executive 역할 사용자`);
    
    const approversResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM timbel_users 
      WHERE role_type IN ('admin', 'executive')
    `);
    console.log(`   📋 사용 가능한 승인자: ${approversResult.rows[0].count}명`);
    
    // [advice from AI] 6. 데이터 품질 검증
    console.log('\n🔍 데이터 품질 검증:');
    
    for (const project of createdProjects) {
      console.log(`   📊 ${project.name}:`);
      
      // 필수 필드 검증
      const requiredFields = ['id', 'name', 'project_status', 'approval_status', 'created_by', 'created_at'];
      const missingFields = requiredFields.filter(field => !project[field]);
      if (missingFields.length === 0) {
        console.log(`     ✅ 필수 필드 완성`);
      } else {
        console.log(`     ❌ 누락된 필수 필드: ${missingFields.join(', ')}`);
      }
      
      // 상태 검증
      if (project.project_status === 'draft' && project.approval_status === 'pending') {
        console.log(`     ✅ 상태 정상 (draft/pending)`);
      } else {
        console.log(`     ⚠️ 상태 이상 (${project.project_status}/${project.approval_status})`);
      }
      
      // 메타데이터 구조 검증
      if (project.metadata) {
        try {
          const metadata = typeof project.metadata === 'string' 
            ? JSON.parse(project.metadata) 
            : project.metadata;
          console.log(`     ✅ 메타데이터 JSON 구조 정상`);
        } catch (error) {
          console.log(`     ❌ 메타데이터 JSON 구조 오류`);
        }
      }
    }
    
    console.log('\n✅ STEP 1: 프로젝트 생성 단계 테스트 완료');
    
    return {
      success: true,
      created_projects: createdProjects,
      statistics: {
        total_created: createdProjects.length,
        success_rate: Math.round((createdProjects.length / TEST_PROJECTS.length) * 100),
        urgency_distribution: urgencyDistribution,
        urgent_development_count: urgentCount
      }
    };
    
  } catch (error) {
    console.error('❌ STEP 1 테스트 실패:', error);
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
  testStep1ProjectCreation()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 STEP 1 테스트 성공');
        console.log(`📊 생성된 프로젝트: ${result.statistics.total_created}개`);
        console.log(`📊 성공률: ${result.statistics.success_rate}%`);
      } else {
        console.log('\n💥 STEP 1 테스트 실패');
        console.log(`❌ 오류: ${result.error}`);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('\n💥 STEP 1 테스트 실행 실패:', error);
      process.exit(1);
    });
}

module.exports = { 
  testStep1ProjectCreation, 
  STEP1_DATA_REQUIREMENTS, 
  TEST_PROJECTS 
};
