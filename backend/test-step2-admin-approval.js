// [advice from AI] STEP 2: 최고운영자 승인 테스트
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

async function testAdminApproval() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 STEP 2: 최고운영자 승인 테스트 시작...\n');
    
    // [advice from AI] 승인 대기 중인 프로젝트 조회
    const pendingProjectsResult = await client.query(`
      SELECT id, name, target_system_name, project_overview, created_at
      FROM projects 
      WHERE status = 'planning'
      ORDER BY created_at DESC
    `);
    
    if (pendingProjectsResult.rows.length === 0) {
      console.log('❌ 승인 대기 중인 프로젝트가 없습니다.');
      console.log('   먼저 STEP 1을 실행하세요: node test-step1-project-creation.js');
      return;
    }
    
    console.log(`📋 승인 대기 중인 프로젝트: ${pendingProjectsResult.rows.length}개`);
    
    // [advice from AI] 관리자 사용자 조회
    const adminResult = await client.query(`
      SELECT id, full_name, email 
      FROM timbel_users 
      WHERE role_type = 'admin'
      ORDER BY full_name
      LIMIT 1
    `);
    
    if (adminResult.rows.length === 0) {
      console.log('❌ 관리자 사용자가 없습니다.');
      return;
    }
    
    const admin = adminResult.rows[0];
    console.log(`👤 승인자: ${admin.full_name} (관리자)`);
    console.log('');
    
    // [advice from AI] PO 사용자들 조회 (할당용)
    const poUsersResult = await client.query(`
      SELECT id, full_name, email 
      FROM timbel_users 
      WHERE role_type = 'po'
      ORDER BY full_name
    `);
    
    if (poUsersResult.rows.length === 0) {
      console.log('❌ PO 사용자가 없습니다.');
      return;
    }
    
    console.log(`👥 사용 가능한 PO: ${poUsersResult.rows.length}명`);
    poUsersResult.rows.forEach((po, index) => {
      console.log(`   ${index + 1}. ${po.full_name}`);
    });
    console.log('');
    
    const approvedProjects = [];
    
    // [advice from AI] 각 프로젝트에 대해 승인 처리
    for (let i = 0; i < pendingProjectsResult.rows.length; i++) {
      const project = pendingProjectsResult.rows[i];
      const assignedPO = poUsersResult.rows[i % poUsersResult.rows.length]; // 순환 할당
      
      console.log(`📋 프로젝트 승인: ${project.name}`);
      console.log(`   할당 PO: ${assignedPO.full_name}`);
      
      try {
        await client.query('BEGIN');
        
        // [advice from AI] 1. 프로젝트 승인 기록 생성
        await client.query(`
          INSERT INTO project_approvals (
            id, project_id, approver_id, approval_action, approval_comment,
            approved_at, created_at, updated_at
          ) VALUES ($1, $2, $3, 'approved', $4, NOW(), NOW(), NOW())
        `, [
          uuidv4(), project.id, admin.id,
          `프로젝트 승인 - PO(${assignedPO.full_name}) 할당 및 개발 진행 승인`
        ]);
        
        // [advice from AI] 2. 프로젝트 상태 업데이트 및 PO 할당
        await client.query(`
          UPDATE projects 
          SET status = 'active', assigned_po = $1, updated_at = NOW() 
          WHERE id = $2
        `, [assignedPO.id, project.id]);
        
        await client.query('COMMIT');
        
        console.log(`   ✅ 승인 완료 (상태: active)`);
        console.log(`   📊 PO 할당: ${assignedPO.full_name}`);
        
        approvedProjects.push({
          id: project.id,
          name: project.name,
          assigned_po: assignedPO.full_name,
          approved_by: admin.full_name
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        console.log(`   ❌ 승인 실패: ${error.message}`);
      }
      
      console.log('');
    }
    
    // [advice from AI] 승인 완료된 프로젝트 현황
    console.log('📊 승인 완료된 프로젝트 현황:');
    const activeProjectsResult = await client.query(`
      SELECT 
        p.id, p.name, p.target_system_name, p.status,
        po.full_name as po_name,
        pa.approved_at,
        admin.full_name as approved_by
      FROM projects p
      LEFT JOIN timbel_users po ON p.assigned_po = po.id
      LEFT JOIN project_approvals pa ON p.id = pa.project_id
      LEFT JOIN timbel_users admin ON pa.approver_id = admin.id
      WHERE p.status = 'active'
      ORDER BY pa.approved_at DESC
      LIMIT 10
    `);
    
    activeProjectsResult.rows.forEach((project, index) => {
      console.log(`   ${index + 1}. ${project.name}`);
      console.log(`      담당 PO: ${project.po_name || '미할당'}`);
      console.log(`      승인자: ${project.approved_by || '알 수 없음'}`);
      console.log(`      승인일: ${project.approved_at ? project.approved_at.toISOString().split('T')[0] : '알 수 없음'}`);
      console.log('');
    });
    
    console.log(`✅ 총 ${approvedProjects.length}개 프로젝트 승인 완료`);
    console.log('\n🎯 다음 단계: STEP 3 - PE 할당');
    console.log('   실행 명령: node test-step3-pe-assignment.js');
    
    return approvedProjects;
    
  } catch (error) {
    console.error('❌ 관리자 승인 테스트 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// [advice from AI] 실행
if (require.main === module) {
  testAdminApproval()
    .then(() => {
      console.log('\n🎉 STEP 2 테스트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 STEP 2 테스트 실패:', error);
      process.exit(1);
    });
}

module.exports = { testAdminApproval };
