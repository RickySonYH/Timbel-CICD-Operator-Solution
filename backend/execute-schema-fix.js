// [advice from AI] 프로젝트 테이블 스키마 수정 실행
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

async function executeSchemaFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 프로젝트 테이블 스키마 수정 시작...\n');
    
    // [advice from AI] 1. 긴급 개발 관련 컬럼 추가
    console.log('📋 긴급 개발 관련 컬럼 추가...');
    
    await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_urgent_development BOOLEAN DEFAULT FALSE
    `);
    console.log('   ✅ is_urgent_development 컬럼 추가');
    
    await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS urgent_reason TEXT
    `);
    console.log('   ✅ urgent_reason 컬럼 추가');
    
    await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS expected_completion_hours INTEGER
    `);
    console.log('   ✅ expected_completion_hours 컬럼 추가');
    
    // [advice from AI] 2. 메타데이터 컬럼 추가
    console.log('\n📋 메타데이터 컬럼 추가...');
    
    await client.query(`
      ALTER TABLE projects ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'
    `);
    console.log('   ✅ metadata 컬럼 추가');
    
    // [advice from AI] 3. 기본값 설정
    console.log('\n📋 기본값 설정...');
    
    await client.query(`
      ALTER TABLE projects ALTER COLUMN urgency_level SET DEFAULT 'medium'
    `);
    console.log('   ✅ urgency_level 기본값 설정');
    
    await client.query(`
      ALTER TABLE projects ALTER COLUMN project_status SET DEFAULT 'planning'
    `);
    console.log('   ✅ project_status 기본값 설정');
    
    await client.query(`
      ALTER TABLE projects ALTER COLUMN approval_status SET DEFAULT 'pending'
    `);
    console.log('   ✅ approval_status 기본값 설정');
    
    // [advice from AI] 4. 인덱스 추가
    console.log('\n📋 성능 최적화 인덱스 추가...');
    
    const indexes = [
      { name: 'idx_projects_domain_id', column: 'domain_id' },
      { name: 'idx_projects_created_by', column: 'created_by' },
      { name: 'idx_projects_urgency_level', column: 'urgency_level' },
      { name: 'idx_projects_project_status', column: 'project_status' },
      { name: 'idx_projects_approval_status', column: 'approval_status' },
      { name: 'idx_projects_deadline', column: 'deadline' },
      { name: 'idx_projects_is_urgent', column: 'is_urgent_development' }
    ];
    
    for (const index of indexes) {
      try {
        await client.query(`
          CREATE INDEX IF NOT EXISTS ${index.name} ON projects(${index.column})
        `);
        console.log(`   ✅ ${index.name} 인덱스 추가`);
      } catch (error) {
        console.log(`   ⚠️ ${index.name} 인덱스 추가 실패: ${error.message}`);
      }
    }
    
    // [advice from AI] 5. 수정된 스키마 확인
    console.log('\n📋 수정된 스키마 확인...');
    
    const schemaResult = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'projects'
      AND column_name IN (
        'is_urgent_development', 'urgent_reason', 'expected_completion_hours', 'metadata'
      )
      ORDER BY ordinal_position;
    `);
    
    console.log('   새로 추가된 컬럼들:');
    schemaResult.rows.forEach(col => {
      console.log(`   📊 ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    // [advice from AI] 6. 기존 프로젝트 데이터에 기본값 설정
    console.log('\n📋 기존 데이터 기본값 설정...');
    
    const updateResult = await client.query(`
      UPDATE projects 
      SET 
        is_urgent_development = COALESCE(is_urgent_development, FALSE),
        metadata = COALESCE(metadata, '{}')
      WHERE is_urgent_development IS NULL OR metadata IS NULL
    `);
    
    console.log(`   ✅ ${updateResult.rowCount}개 레코드 기본값 설정 완료`);
    
    // [advice from AI] 7. 최종 검증
    console.log('\n📋 최종 스키마 검증...');
    
    const finalResult = await client.query(`
      SELECT COUNT(*) as total_projects,
             COUNT(CASE WHEN is_urgent_development IS NOT NULL THEN 1 END) as has_urgent_flag,
             COUNT(CASE WHEN metadata IS NOT NULL THEN 1 END) as has_metadata
      FROM projects
    `);
    
    const stats = finalResult.rows[0];
    console.log(`   📊 총 프로젝트: ${stats.total_projects}개`);
    console.log(`   📊 긴급 플래그 설정: ${stats.has_urgent_flag}개`);
    console.log(`   📊 메타데이터 설정: ${stats.has_metadata}개`);
    
    console.log('\n✅ 프로젝트 테이블 스키마 수정 완료!');
    console.log('🎯 이제 프론트엔드 폼과 백엔드 API가 정상적으로 작동할 것입니다.');
    
  } catch (error) {
    console.error('❌ 스키마 수정 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// [advice from AI] 실행
if (require.main === module) {
  executeSchemaFix()
    .then(() => {
      console.log('\n🎉 스키마 수정 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스키마 수정 실패:', error);
      process.exit(1);
    });
}

module.exports = { executeSchemaFix };
