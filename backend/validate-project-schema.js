// [advice from AI] 프로젝트 생성 폼과 데이터베이스 스키마 검증
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] 프론트엔드 폼에서 사용하는 필드들
const frontendFormFields = {
  // 기본 정보
  name: { type: 'string', required: true, description: '프로젝트명' },
  domain_id: { type: 'uuid', required: true, description: '소속 도메인' },
  project_overview: { type: 'text', required: false, description: '프로젝트 개요' },
  target_system_name: { type: 'string', required: false, description: '목표 시스템명' },
  
  // 우선순위 및 일정
  urgency_level: { type: 'enum', required: true, values: ['low', 'medium', 'high', 'critical'], description: '긴급도' },
  deadline: { type: 'date', required: false, description: '마감일' },
  
  // 상태 관리
  project_status: { type: 'enum', required: true, values: ['planning', 'in_progress', 'development', 'testing', 'completed', 'on_hold', 'cancelled'], description: '프로젝트 상태' },
  approval_status: { type: 'enum', required: true, values: ['pending', 'approved', 'rejected', 'draft'], description: '승인 상태' },
  
  // 긴급 개발 관련
  is_urgent_development: { type: 'boolean', required: false, description: '긴급 개발 여부' },
  urgent_reason: { type: 'text', required: false, description: '긴급 사유' },
  expected_completion_hours: { type: 'integer', required: false, description: '예상 완료 시간' },
  
  // 메타데이터
  similar_systems: { type: 'array', required: false, description: '유사 시스템 목록' },
  work_groups: { type: 'array', required: false, description: '작업 그룹 목록' },
  metadata: { type: 'jsonb', required: false, description: '추가 메타데이터' },
  
  // 시스템 필드
  created_by: { type: 'uuid', required: true, description: '생성자' },
  created_at: { type: 'timestamp', required: true, description: '생성일시' },
  updated_at: { type: 'timestamp', required: true, description: '수정일시' }
};

// [advice from AI] 백엔드 API에서 사용하는 필드들 (projects-simple.js 기준)
const backendApiFields = {
  name: 'string',
  project_overview: 'text', 
  target_system_name: 'string',
  urgency_level: 'enum',
  deadline: 'date',
  similar_systems: 'json_string',
  work_groups: 'json_string',
  metadata: 'jsonb',
  created_by: 'uuid'
  // domain_id는 주석 처리되어 있음
};

async function validateProjectSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 프로젝트 스키마 검증 시작...\n');
    
    // [advice from AI] 1. 실제 데이터베이스 스키마 조회
    console.log('📋 실제 projects 테이블 스키마:');
    const schemaResult = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'projects'
      ORDER BY ordinal_position;
    `);
    
    const actualColumns = {};
    schemaResult.rows.forEach(col => {
      actualColumns[col.column_name] = {
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        max_length: col.character_maximum_length
      };
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    console.log('\n🔍 스키마 일치성 검증:');
    
    // [advice from AI] 2. 프론트엔드 필드와 실제 스키마 비교
    console.log('\n📱 프론트엔드 → 데이터베이스 매핑:');
    let missingColumns = [];
    let typeConflicts = [];
    
    Object.entries(frontendFormFields).forEach(([fieldName, fieldInfo]) => {
      if (actualColumns[fieldName]) {
        console.log(`   ✅ ${fieldName}: ${fieldInfo.description} → ${actualColumns[fieldName].type}`);
        
        // 타입 호환성 검사
        const dbType = actualColumns[fieldName].type;
        const expectedType = fieldInfo.type;
        
        if (expectedType === 'uuid' && dbType !== 'uuid') {
          typeConflicts.push(`${fieldName}: expected uuid, got ${dbType}`);
        } else if (expectedType === 'enum' && !dbType.includes('character')) {
          typeConflicts.push(`${fieldName}: expected enum/varchar, got ${dbType}`);
        }
      } else {
        console.log(`   ❌ ${fieldName}: ${fieldInfo.description} → 컬럼 없음`);
        missingColumns.push(fieldName);
      }
    });
    
    // [advice from AI] 3. 백엔드 API와 실제 스키마 비교
    console.log('\n🔧 백엔드 API → 데이터베이스 매핑:');
    Object.entries(backendApiFields).forEach(([fieldName, fieldType]) => {
      if (actualColumns[fieldName]) {
        console.log(`   ✅ ${fieldName}: API에서 사용 → DB에 존재`);
      } else {
        console.log(`   ❌ ${fieldName}: API에서 사용 → DB에 없음`);
      }
    });
    
    // [advice from AI] 4. 데이터베이스에만 있는 컬럼들
    console.log('\n🗃️ 데이터베이스 전용 컬럼들:');
    Object.keys(actualColumns).forEach(colName => {
      if (!frontendFormFields[colName] && !backendApiFields[colName]) {
        console.log(`   📊 ${colName}: ${actualColumns[colName].type} (프론트엔드/API에서 미사용)`);
      }
    });
    
    // [advice from AI] 5. 문제점 요약
    console.log('\n⚠️ 발견된 문제점:');
    if (missingColumns.length > 0) {
      console.log(`   📋 누락된 컬럼: ${missingColumns.join(', ')}`);
    }
    if (typeConflicts.length > 0) {
      console.log(`   🔄 타입 불일치: ${typeConflicts.join(', ')}`);
    }
    
    if (missingColumns.length === 0 && typeConflicts.length === 0) {
      console.log('   ✅ 스키마 일치성 문제 없음');
    }
    
    // [advice from AI] 6. 실제 데이터 샘플 확인
    console.log('\n📊 실제 프로젝트 데이터 샘플:');
    const sampleResult = await client.query(`
      SELECT 
        id, name, project_overview, target_system_name, 
        urgency_level, deadline, project_status, approval_status,
        created_at, updated_at
      FROM projects 
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    
    if (sampleResult.rows.length > 0) {
      sampleResult.rows.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.name}`);
        console.log(`      개요: ${project.project_overview || '없음'}`);
        console.log(`      시스템명: ${project.target_system_name || '없음'}`);
        console.log(`      긴급도: ${project.urgency_level || '없음'}`);
        console.log(`      상태: ${project.project_status}/${project.approval_status}`);
        console.log(`      생성일: ${project.created_at ? project.created_at.toISOString().split('T')[0] : '없음'}`);
        console.log('');
      });
    } else {
      console.log('   📭 프로젝트 데이터 없음');
    }
    
    console.log('✅ 프로젝트 스키마 검증 완료');
    
  } catch (error) {
    console.error('❌ 스키마 검증 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// [advice from AI] 실행
if (require.main === module) {
  validateProjectSchema()
    .then(() => {
      console.log('\n🎉 스키마 검증 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스키마 검증 실패:', error);
      process.exit(1);
    });
}

module.exports = { validateProjectSchema };
