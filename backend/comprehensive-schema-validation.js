// [advice from AI] 워크플로우 명세서 기준 전체 스키마 통합 검증 및 수정
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] 워크플로우 명세서 기준 테이블 스키마 정의
const WORKFLOW_SCHEMA_SPEC = {
  // 핵심 워크플로우 테이블
  projects: {
    required_columns: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      name: { type: 'varchar', nullable: false },
      description: { type: 'text', nullable: true },
      domain_id: { type: 'uuid', nullable: true, references: 'domains(id)' },
      project_overview: { type: 'text', nullable: true },
      target_system_name: { type: 'varchar', nullable: true },
      urgency_level: { type: 'varchar', nullable: true, default: 'medium' },
      deadline: { type: 'date', nullable: true },
      project_status: { type: 'varchar', nullable: true, default: 'draft' },
      approval_status: { type: 'varchar', nullable: true, default: 'pending' },
      is_urgent_development: { type: 'boolean', nullable: true, default: false },
      urgent_reason: { type: 'text', nullable: true },
      expected_completion_hours: { type: 'integer', nullable: true },
      metadata: { type: 'jsonb', nullable: true, default: '{}' },
      created_by: { type: 'uuid', nullable: true, references: 'timbel_users(id)' },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' },
      updated_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  project_status_history: {
    required_columns: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      project_id: { type: 'uuid', nullable: false, references: 'projects(id)' },
      from_status: { type: 'varchar', nullable: true },
      to_status: { type: 'varchar', nullable: true },
      changed_by: { type: 'uuid', nullable: false, references: 'timbel_users(id)' },
      change_reason: { type: 'text', nullable: true },
      change_type: { type: 'varchar', nullable: true, default: 'normal' },
      metadata: { type: 'jsonb', nullable: true, default: '{}' },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  project_control_actions: {
    required_columns: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      project_id: { type: 'uuid', nullable: false, references: 'projects(id)' },
      action_type: { type: 'varchar', nullable: false },
      initiated_by: { type: 'uuid', nullable: false, references: 'timbel_users(id)' },
      target_stage: { type: 'varchar', nullable: true },
      reason: { type: 'text', nullable: false },
      approval_required: { type: 'boolean', nullable: true, default: false },
      approved_by: { type: 'uuid', nullable: true, references: 'timbel_users(id)' },
      approved_at: { type: 'timestamp', nullable: true },
      executed_at: { type: 'timestamp', nullable: true },
      status: { type: 'varchar', nullable: true, default: 'pending' },
      metadata: { type: 'jsonb', nullable: true, default: '{}' },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  project_approvals: {
    required_columns: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      project_id: { type: 'uuid', nullable: false, references: 'projects(id)' },
      approver_id: { type: 'uuid', nullable: false, references: 'timbel_users(id)' },
      approval_action: { type: 'varchar', nullable: true },
      approval_comment: { type: 'text', nullable: true },
      conditions: { type: 'text', nullable: true },
      approved_at: { type: 'timestamp', nullable: true },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  work_groups: {
    required_columns: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      project_id: { type: 'uuid', nullable: false, references: 'projects(id)' },
      name: { type: 'varchar', nullable: false },
      description: { type: 'text', nullable: true },
      estimated_hours: { type: 'integer', nullable: true },
      status: { type: 'varchar', nullable: true, default: 'planned' },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' },
      updated_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  project_work_assignments: {
    required_columns: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      project_id: { type: 'uuid', nullable: false, references: 'projects(id)' },
      work_group_id: { type: 'uuid', nullable: true, references: 'work_groups(id)' },
      assigned_pe_id: { type: 'uuid', nullable: false, references: 'timbel_users(id)' },
      assignment_date: { type: 'timestamp', nullable: true, default: 'NOW()' },
      estimated_hours: { type: 'integer', nullable: true },
      assignment_notes: { type: 'text', nullable: true },
      status: { type: 'varchar', nullable: true, default: 'assigned' },
      completion_date: { type: 'timestamp', nullable: true },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  project_completion_reports: {
    required_columns: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      project_id: { type: 'uuid', nullable: false, references: 'projects(id)' },
      work_group_id: { type: 'uuid', nullable: true, references: 'work_groups(id)' },
      reported_by: { type: 'uuid', nullable: false, references: 'timbel_users(id)' },
      completion_percentage: { type: 'integer', nullable: true, default: 0 },
      technical_summary: { type: 'text', nullable: true },
      challenges_faced: { type: 'text', nullable: true },
      lessons_learned: { type: 'text', nullable: true },
      next_steps: { type: 'text', nullable: true },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' },
      updated_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  qc_qa_requests: {
    required_columns: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      project_id: { type: 'uuid', nullable: false, references: 'projects(id)' },
      requested_by: { type: 'uuid', nullable: false, references: 'timbel_users(id)' },
      assigned_qa: { type: 'uuid', nullable: true, references: 'timbel_users(id)' },
      qc_type: { type: 'varchar', nullable: true },
      priority: { type: 'varchar', nullable: true, default: 'medium' },
      requirements_document: { type: 'text', nullable: true },
      test_scenarios: { type: 'text', nullable: true },
      quality_criteria: { type: 'text', nullable: true },
      qc_feedback: { type: 'text', nullable: true },
      qa_feedback: { type: 'text', nullable: true },
      overall_score: { type: 'integer', nullable: true },
      status: { type: 'varchar', nullable: true, default: 'pending' },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' },
      updated_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  project_completion_approvals: {
    required_columns: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      project_id: { type: 'uuid', nullable: false, references: 'projects(id)' },
      approver_id: { type: 'uuid', nullable: false, references: 'timbel_users(id)' },
      knowledge_resource_decision: { type: 'varchar', nullable: true, default: 'register' },
      knowledge_resource_category: { type: 'varchar', nullable: true },
      final_approval_comment: { type: 'text', nullable: true },
      business_value_assessment: { type: 'text', nullable: true },
      approved_at: { type: 'timestamp', nullable: true },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  system_registrations: {
    required_columns: {
      id: { type: 'integer', nullable: false, auto_increment: true },
      project_id: { type: 'uuid', nullable: true, references: 'projects(id)' },
      po_decision: { type: 'varchar', nullable: true, default: 'pending' },
      admin_decision: { type: 'varchar', nullable: true },
      registration_notes: { type: 'text', nullable: true },
      deployment_priority: { type: 'varchar', nullable: true, default: 'normal' },
      target_environment: { type: 'varchar', nullable: true, default: 'production' },
      decided_by: { type: 'uuid', nullable: true, references: 'timbel_users(id)' },
      created_at: { type: 'timestamp', nullable: true, default: 'CURRENT_TIMESTAMP' },
      updated_at: { type: 'timestamp', nullable: true, default: 'CURRENT_TIMESTAMP' }
    }
  },
  
  deployment_approvals: {
    required_columns: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      system_registration_id: { type: 'integer', nullable: false, references: 'system_registrations(id)' },
      approver_id: { type: 'uuid', nullable: false, references: 'timbel_users(id)' },
      infrastructure_review: { type: 'text', nullable: true },
      resource_allocation_plan: { type: 'text', nullable: true },
      deployment_schedule: { type: 'timestamp', nullable: true },
      risk_assessment: { type: 'text', nullable: true },
      rollback_plan: { type: 'text', nullable: true },
      approval_status: { type: 'varchar', nullable: true, default: 'pending' },
      approved_at: { type: 'timestamp', nullable: true },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  deployments: {
    required_columns: {
      id: { type: 'uuid', nullable: false, default: 'gen_random_uuid()' },
      deployment_approval_id: { type: 'uuid', nullable: false, references: 'deployment_approvals(id)' },
      deployed_by: { type: 'uuid', nullable: false, references: 'timbel_users(id)' },
      deployment_environment: { type: 'varchar', nullable: true },
      deployment_method: { type: 'varchar', nullable: true, default: 'automated' },
      deployment_logs: { type: 'text', nullable: true },
      infrastructure_config: { type: 'jsonb', nullable: true, default: '{}' },
      monitoring_setup: { type: 'jsonb', nullable: true, default: '{}' },
      deployment_status: { type: 'varchar', nullable: true, default: 'in_progress' },
      started_at: { type: 'timestamp', nullable: true, default: 'NOW()' },
      completed_at: { type: 'timestamp', nullable: true },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  build_failures: {
    required_columns: {
      id: { type: 'integer', nullable: false, auto_increment: true },
      project_id: { type: 'uuid', nullable: true, references: 'projects(id)' },
      build_number: { type: 'varchar', nullable: true },
      repository_url: { type: 'varchar', nullable: true },
      branch_name: { type: 'varchar', nullable: true },
      commit_hash: { type: 'varchar', nullable: true },
      failed_at: { type: 'timestamp', nullable: true },
      build_duration: { type: 'integer', nullable: true },
      error_type: { type: 'varchar', nullable: true },
      error_stage: { type: 'varchar', nullable: true },
      error_message: { type: 'text', nullable: true },
      stack_trace: { type: 'text', nullable: true },
      build_logs_url: { type: 'varchar', nullable: true },
      assigned_to: { type: 'uuid', nullable: true, references: 'timbel_users(id)' },
      created_at: { type: 'timestamp', nullable: true, default: 'NOW()' },
      updated_at: { type: 'timestamp', nullable: true, default: 'NOW()' }
    }
  },
  
  issue_reports: {
    required_columns: {
      id: { type: 'integer', nullable: false, auto_increment: true },
      build_failure_id: { type: 'integer', nullable: true, references: 'build_failures(id)' },
      title: { type: 'varchar', nullable: false },
      description: { type: 'text', nullable: true },
      error_category: { type: 'varchar', nullable: true },
      severity: { type: 'varchar', nullable: true },
      assigned_to: { type: 'uuid', nullable: true, references: 'timbel_users(id)' },
      status: { type: 'varchar', nullable: true },
      resolution: { type: 'varchar', nullable: true },
      resolution_notes: { type: 'text', nullable: true },
      resolved_by: { type: 'uuid', nullable: true, references: 'timbel_users(id)' },
      resolved_at: { type: 'timestamp', nullable: true },
      reproduction_steps: { type: 'jsonb', nullable: true },
      suggested_solution: { type: 'text', nullable: true },
      created_by: { type: 'uuid', nullable: true, references: 'timbel_users(id)' },
      created_at: { type: 'timestamp', nullable: true },
      updated_at: { type: 'timestamp', nullable: true }
    }
  }
};

async function comprehensiveSchemaValidation() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 워크플로우 명세서 기준 전체 스키마 검증 시작...\n');
    
    const validationResults = {
      existing_tables: {},
      missing_tables: [],
      schema_mismatches: {},
      fixes_applied: []
    };
    
    // [advice from AI] 1. 기존 테이블 스키마 조회
    console.log('📋 기존 테이블 스키마 조회:');
    
    for (const [tableName, tableSpec] of Object.entries(WORKFLOW_SCHEMA_SPEC)) {
      console.log(`\n🔍 ${tableName} 테이블 검증:`);
      
      // 테이블 존재 확인
      const tableExists = await client.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      
      if (tableExists.rows[0].count === 0) {
        console.log(`   ❌ 테이블 없음 - 생성 필요`);
        validationResults.missing_tables.push(tableName);
        continue;
      }
      
      // 기존 컬럼 조회
      const existingColumns = await client.query(`
        SELECT 
          column_name, 
          data_type, 
          is_nullable, 
          column_default,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);
      
      const existingColumnMap = {};
      existingColumns.rows.forEach(col => {
        existingColumnMap[col.column_name] = {
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          max_length: col.character_maximum_length
        };
      });
      
      validationResults.existing_tables[tableName] = existingColumnMap;
      
      // 필수 컬럼 검증
      const missingColumns = [];
      const typeConflicts = [];
      
      for (const [columnName, columnSpec] of Object.entries(tableSpec.required_columns)) {
        if (!existingColumnMap[columnName]) {
          missingColumns.push(columnName);
          console.log(`   ❌ 누락된 컬럼: ${columnName} (${columnSpec.type})`);
        } else {
          const existing = existingColumnMap[columnName];
          const expectedType = columnSpec.type;
          
          // 타입 호환성 검사
          let typeMatch = false;
          if (expectedType === 'uuid' && existing.type === 'uuid') typeMatch = true;
          else if (expectedType === 'varchar' && existing.type.includes('character')) typeMatch = true;
          else if (expectedType === 'text' && existing.type === 'text') typeMatch = true;
          else if (expectedType === 'integer' && existing.type === 'integer') typeMatch = true;
          else if (expectedType === 'boolean' && existing.type === 'boolean') typeMatch = true;
          else if (expectedType === 'timestamp' && existing.type.includes('timestamp')) typeMatch = true;
          else if (expectedType === 'date' && existing.type === 'date') typeMatch = true;
          else if (expectedType === 'jsonb' && existing.type === 'jsonb') typeMatch = true;
          
          if (typeMatch) {
            console.log(`   ✅ ${columnName}: ${existing.type}`);
          } else {
            typeConflicts.push(`${columnName}: expected ${expectedType}, got ${existing.type}`);
            console.log(`   ⚠️ ${columnName}: 타입 불일치 (expected: ${expectedType}, actual: ${existing.type})`);
          }
        }
      }
      
      if (missingColumns.length > 0 || typeConflicts.length > 0) {
        validationResults.schema_mismatches[tableName] = {
          missing_columns: missingColumns,
          type_conflicts: typeConflicts
        };
      }
      
      // 데이터 개수 표시
      const dataCount = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`   📊 데이터: ${dataCount.rows[0].count}개 레코드`);
    }
    
    // [advice from AI] 2. 누락된 테이블 생성
    if (validationResults.missing_tables.length > 0) {
      console.log('\n🔧 누락된 테이블 생성:');
      
      for (const tableName of validationResults.missing_tables) {
        console.log(`\n🔨 ${tableName} 테이블 생성 중...`);
        
        try {
          const createSQL = generateCreateTableSQL(tableName, WORKFLOW_SCHEMA_SPEC[tableName]);
          await client.query(createSQL);
          console.log(`   ✅ ${tableName} 테이블 생성 완료`);
          validationResults.fixes_applied.push(`Created table: ${tableName}`);
        } catch (error) {
          console.log(`   ❌ ${tableName} 테이블 생성 실패: ${error.message}`);
        }
      }
    }
    
    // [advice from AI] 3. 스키마 불일치 수정
    if (Object.keys(validationResults.schema_mismatches).length > 0) {
      console.log('\n🔧 스키마 불일치 수정:');
      
      for (const [tableName, mismatches] of Object.entries(validationResults.schema_mismatches)) {
        console.log(`\n🔨 ${tableName} 테이블 수정 중...`);
        
        // 누락된 컬럼 추가
        for (const columnName of mismatches.missing_columns) {
          try {
            const columnSpec = WORKFLOW_SCHEMA_SPEC[tableName].required_columns[columnName];
            const alterSQL = generateAddColumnSQL(tableName, columnName, columnSpec);
            await client.query(alterSQL);
            console.log(`   ✅ ${columnName} 컬럼 추가 완료`);
            validationResults.fixes_applied.push(`Added column: ${tableName}.${columnName}`);
          } catch (error) {
            console.log(`   ❌ ${columnName} 컬럼 추가 실패: ${error.message}`);
          }
        }
      }
    }
    
    // [advice from AI] 4. 검증 결과 요약
    console.log('\n📊 스키마 검증 결과 요약:');
    console.log(`   📋 검증된 테이블: ${Object.keys(WORKFLOW_SCHEMA_SPEC).length}개`);
    console.log(`   ✅ 기존 테이블: ${Object.keys(validationResults.existing_tables).length}개`);
    console.log(`   🔨 생성된 테이블: ${validationResults.missing_tables.length}개`);
    console.log(`   🔧 수정된 테이블: ${Object.keys(validationResults.schema_mismatches).length}개`);
    console.log(`   ⚡ 적용된 수정사항: ${validationResults.fixes_applied.length}개`);
    
    if (validationResults.fixes_applied.length > 0) {
      console.log('\n🎯 적용된 수정사항:');
      validationResults.fixes_applied.forEach(fix => {
        console.log(`   - ${fix}`);
      });
    }
    
    console.log('\n✅ 전체 스키마 검증 완료');
    return validationResults;
    
  } catch (error) {
    console.error('❌ 스키마 검증 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// [advice from AI] CREATE TABLE SQL 생성
function generateCreateTableSQL(tableName, tableSpec) {
  const columns = [];
  
  for (const [columnName, columnSpec] of Object.entries(tableSpec.required_columns)) {
    let columnDef = `${columnName} `;
    
    // 타입 변환
    switch (columnSpec.type) {
      case 'uuid':
        columnDef += 'UUID';
        break;
      case 'varchar':
        columnDef += 'VARCHAR';
        break;
      case 'text':
        columnDef += 'TEXT';
        break;
      case 'integer':
        if (columnSpec.auto_increment) {
          columnDef += 'SERIAL';
        } else {
          columnDef += 'INTEGER';
        }
        break;
      case 'boolean':
        columnDef += 'BOOLEAN';
        break;
      case 'timestamp':
        columnDef += 'TIMESTAMP';
        break;
      case 'date':
        columnDef += 'DATE';
        break;
      case 'jsonb':
        columnDef += 'JSONB';
        break;
      default:
        columnDef += 'TEXT';
    }
    
    // NULL 제약
    if (!columnSpec.nullable) {
      columnDef += ' NOT NULL';
    }
    
    // 기본값
    if (columnSpec.default) {
      if (columnSpec.default === 'gen_random_uuid()' || columnSpec.default === 'NOW()' || columnSpec.default === 'CURRENT_TIMESTAMP') {
        columnDef += ` DEFAULT ${columnSpec.default}`;
      } else if (typeof columnSpec.default === 'string') {
        columnDef += ` DEFAULT '${columnSpec.default}'`;
      } else {
        columnDef += ` DEFAULT ${columnSpec.default}`;
      }
    }
    
    columns.push(columnDef);
  }
  
  // PRIMARY KEY 추가
  const primaryKeyColumn = Object.keys(tableSpec.required_columns).find(col => 
    tableSpec.required_columns[col].type === 'uuid' || 
    tableSpec.required_columns[col].auto_increment
  );
  
  if (primaryKeyColumn) {
    columns.push(`PRIMARY KEY (${primaryKeyColumn})`);
  }
  
  return `CREATE TABLE ${tableName} (\n  ${columns.join(',\n  ')}\n);`;
}

// [advice from AI] ADD COLUMN SQL 생성
function generateAddColumnSQL(tableName, columnName, columnSpec) {
  let alterSQL = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} `;
  
  // 타입 변환
  switch (columnSpec.type) {
    case 'uuid':
      alterSQL += 'UUID';
      break;
    case 'varchar':
      alterSQL += 'VARCHAR';
      break;
    case 'text':
      alterSQL += 'TEXT';
      break;
    case 'integer':
      alterSQL += 'INTEGER';
      break;
    case 'boolean':
      alterSQL += 'BOOLEAN';
      break;
    case 'timestamp':
      alterSQL += 'TIMESTAMP';
      break;
    case 'date':
      alterSQL += 'DATE';
      break;
    case 'jsonb':
      alterSQL += 'JSONB';
      break;
    default:
      alterSQL += 'TEXT';
  }
  
  // 기본값
  if (columnSpec.default) {
    if (columnSpec.default === 'gen_random_uuid()' || columnSpec.default === 'NOW()' || columnSpec.default === 'CURRENT_TIMESTAMP') {
      alterSQL += ` DEFAULT ${columnSpec.default}`;
    } else if (typeof columnSpec.default === 'string') {
      alterSQL += ` DEFAULT '${columnSpec.default}'`;
    } else {
      alterSQL += ` DEFAULT ${columnSpec.default}`;
    }
  }
  
  return alterSQL;
}

// [advice from AI] 실행
if (require.main === module) {
  comprehensiveSchemaValidation()
    .then(() => {
      console.log('\n🎉 전체 스키마 검증 및 수정 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 스키마 검증 실패:', error);
      process.exit(1);
    });
}

module.exports = { comprehensiveSchemaValidation, WORKFLOW_SCHEMA_SPEC };
