// [advice from AI] 데이터베이스 스키마 검증 스크립트
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

async function validateDatabaseSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 데이터베이스 스키마 검증 시작...\n');
    
    // [advice from AI] 필수 테이블들 존재 여부 확인
    const requiredTables = [
      'projects',
      'timbel_users',
      'work_groups',
      'project_work_assignments',
      'project_repositories',
      'project_completion_reports',
      'qc_qa_requests',
      'system_registrations',
      'build_failures',
      'issue_reports',
      'project_approvals'
    ];
    
    console.log('📋 필수 테이블 존재 여부 확인:');
    for (const table of requiredTables) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);
        
        const exists = result.rows[0].exists;
        console.log(`   ${exists ? '✅' : '❌'} ${table}: ${exists ? '존재' : '없음'}`);
        
        if (exists) {
          // 테이블 컬럼 정보 조회
          const columnsResult = await client.query(`
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1
            ORDER BY ordinal_position;
          `, [table]);
          
          console.log(`      컬럼 수: ${columnsResult.rows.length}`);
          
          // ID 컬럼 타입 확인 (UUID vs SERIAL)
          const idColumn = columnsResult.rows.find(col => col.column_name === 'id');
          if (idColumn) {
            console.log(`      ID 타입: ${idColumn.data_type} ${idColumn.column_default ? `(기본값: ${idColumn.column_default})` : ''}`);
          }
        }
      } catch (error) {
        console.log(`   ❌ ${table}: 오류 - ${error.message}`);
      }
    }
    
    console.log('\n🔍 사용자 데이터 확인:');
    
    // [advice from AI] 사용자 역할별 개수 확인
    const usersResult = await client.query(`
      SELECT role_type, COUNT(*) as count 
      FROM timbel_users 
      GROUP BY role_type 
      ORDER BY role_type
    `);
    
    console.log('   역할별 사용자 수:');
    usersResult.rows.forEach(row => {
      console.log(`     ${row.role_type}: ${row.count}명`);
    });
    
    // [advice from AI] 각 역할별 사용자 목록
    console.log('\n   역할별 사용자 목록:');
    const allUsersResult = await client.query(`
      SELECT id, full_name, role_type, email 
      FROM timbel_users 
      WHERE role_type IN ('admin', 'po', 'pe', 'qa', 'operations')
      ORDER BY role_type, full_name
    `);
    
    allUsersResult.rows.forEach(user => {
      console.log(`     ${user.role_type}: ${user.full_name} (${user.email || 'no-email'})`);
    });
    
    console.log('\n✅ 데이터베이스 스키마 검증 완료');
    
  } catch (error) {
    console.error('❌ 스키마 검증 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// [advice from AI] 실행
if (require.main === module) {
  validateDatabaseSchema()
    .then(() => {
      console.log('\n🎉 스키마 검증 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스키마 검증 실패:', error);
      process.exit(1);
    });
}

module.exports = { validateDatabaseSchema };
