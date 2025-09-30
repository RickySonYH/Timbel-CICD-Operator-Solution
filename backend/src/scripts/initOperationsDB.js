// [advice from AI] 운영 센터 데이터베이스 초기화 스크립트
// PostgreSQL 스키마 생성, 샘플 데이터 삽입

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

class OperationsDBInitializer {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'postgres', // Docker 컨테이너 이름
      port: parseInt(process.env.DB_PORT || '5432'), // 내부 포트
      database: process.env.DB_NAME || 'timbel_knowledge', // Docker Compose 설정과 맞춤
      user: process.env.DB_USER || 'timbel_user', 
      password: process.env.DB_PASSWORD || 'timbel_password'
    });
  }

  async initialize() {
    const client = await this.pool.connect();
    
    try {
      console.log('🚀 운영 센터 데이터베이스 초기화 시작...');

      // [advice from AI] 1. 스키마 파일 읽기
      const schemaPath = path.join(__dirname, '../database/operations-schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');

      // [advice from AI] 2. 기존 테이블 삭제 (개발 환경용)
      if (process.env.NODE_ENV === 'development') {
        await this.dropExistingTables(client);
      }

      // [advice from AI] 3. 스키마 실행
      await client.query(schemaSql);
      console.log('✅ 운영 센터 스키마 생성 완료');

      // [advice from AI] 4. 추가 샘플 데이터 삽입
      await this.insertAdditionalSampleData(client);
      console.log('✅ 샘플 데이터 삽입 완료');

      console.log('🎉 운영 센터 데이터베이스 초기화 완료');

    } catch (error) {
      console.error('💥 데이터베이스 초기화 오류:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async dropExistingTables(client) {
    console.log('🗑️ 기존 운영 센터 테이블 삭제 중...');
    
    const dropQueries = [
      'DROP VIEW IF EXISTS view_deployment_stats CASCADE',
      'DROP VIEW IF EXISTS view_tenant_summary CASCADE',
      'DROP TABLE IF EXISTS operations_build_executions CASCADE',
      'DROP TABLE IF EXISTS operations_build_pipelines CASCADE',
      'DROP TABLE IF EXISTS operations_alerts CASCADE',
      'DROP TABLE IF EXISTS operations_service_monitoring CASCADE',
      'DROP TABLE IF EXISTS operations_deployments CASCADE',
      'DROP TABLE IF EXISTS operations_tenant_services CASCADE',
      'DROP TABLE IF EXISTS operations_tenants CASCADE',
      'DROP TABLE IF EXISTS operations_infrastructure_nodes CASCADE',
      'DROP TABLE IF EXISTS operations_infrastructures CASCADE'
    ];

    for (const query of dropQueries) {
      try {
        await client.query(query);
      } catch (error) {
        // 테이블이 없으면 무시
        if (!error.message.includes('does not exist')) {
          console.warn('테이블 삭제 경고:', error.message);
        }
      }
    }
  }

  async insertAdditionalSampleData(client) {
    // [advice from AI] 추가 인프라 노드 데이터
    await client.query(`
      INSERT INTO operations_infrastructure_nodes (infrastructure_id, node_name, node_type, status, cpu_cores, memory_gb, storage_gb, gpu_count, os_version, k8s_version)
      SELECT 
        i.id,
        CASE 
          WHEN i.name LIKE '%프로덕션%' THEN 'prod-node-' || generate_series
          WHEN i.name LIKE '%개발%' THEN 'dev-node-' || generate_series
          ELSE 'staging-node-' || generate_series
        END,
        CASE 
          WHEN generate_series = 1 THEN 'master'
          ELSE 'worker'
        END,
        'running',
        CASE WHEN generate_series = 1 THEN 4 ELSE 8 END,
        CASE WHEN generate_series = 1 THEN 16 ELSE 32 END,
        CASE WHEN generate_series = 1 THEN 100 ELSE 200 END,
        CASE WHEN generate_series > 1 AND i.total_gpu > 0 THEN 1 ELSE 0 END,
        'Ubuntu 20.04',
        i.k8s_version
      FROM operations_infrastructures i
      CROSS JOIN generate_series(1, LEAST(i.node_count, 5))
      WHERE NOT EXISTS (
        SELECT 1 FROM operations_infrastructure_nodes n WHERE n.infrastructure_id = i.id
      )
    `);

    // [advice from AI] 추가 테넌트 서비스 데이터
    const additionalServices = [
      {
        tenant: 'timbel-prod-001',
        services: [
          { name: 'stt', type: 'stt', displayName: '🎤 STT 서비스', channels: 15, cpu: 0.8, memory: 1.5, gpu: 0, image: 'ecp-ai/stt' },
          { name: 'tts', type: 'tts', displayName: '🔊 TTS 서비스', channels: 10, cpu: 1.0, memory: 2.0, gpu: 1, image: 'ecp-ai/tts' },
          { name: 'ta', type: 'ta', displayName: '📊 TA 서비스', channels: 8, cpu: 0.4, memory: 0.8, gpu: 0, image: 'ecp-ai/text-analytics' },
          { name: 'qa', type: 'qa', displayName: '✅ QA 서비스', channels: 12, cpu: 0.3, memory: 0.5, gpu: 0, image: 'ecp-ai/qa-service' }
        ]
      },
      {
        tenant: 'timbel-dev-001',
        services: [
          { name: 'callbot', type: 'callbot', displayName: '📞 콜봇 서비스', channels: 5, cpu: 0.3, memory: 0.5, gpu: 0, image: 'ecp-ai/callbot' },
          { name: 'chatbot', type: 'chatbot', displayName: '💬 챗봇 서비스', channels: 10, cpu: 0.2, memory: 0.5, gpu: 0, image: 'ecp-ai/chatbot' }
        ]
      }
    ];

    for (const tenantData of additionalServices) {
      for (const service of tenantData.services) {
        await client.query(`
          INSERT INTO operations_tenant_services 
          (tenant_id, service_name, service_type, display_name, channels, cpu_cores, memory_gb, 
           gpu_count, storage_gb, replicas, image_name, advanced_settings, status)
          VALUES (
            (SELECT id FROM operations_tenants WHERE tenant_id = $1),
            $2, $3, $4, $5, $6, $7, $8, 10, 1, $9,
            $10, 'running'
          )
          ON CONFLICT DO NOTHING
        `, [
          tenantData.tenant, service.name, service.type, service.displayName, 
          service.channels, service.cpu, service.memory, service.gpu, service.image,
          JSON.stringify({
            endpoint: `http://${service.name}-service:8080`,
            maxConnections: service.channels * 2,
            timeout: 30000
          })
        ]);
      }
    }

    // [advice from AI] 샘플 배포 기록
    await client.query(`
      INSERT INTO operations_deployments 
      (deployment_id, tenant_id, deployment_strategy, manifest_count, manifest_files, 
       resource_requirements, estimated_cost, status, progress, current_step, deployment_logs,
       started_at, completed_at)
      VALUES 
      (
        'deploy-' || extract(epoch from now())::text,
        (SELECT id FROM operations_tenants WHERE tenant_id = 'timbel-prod-001'),
        'rolling', 8, 
        ARRAY['namespace.yaml', 'configmap.yaml', 'service.yaml', 'ingress.yaml', 'monitoring.yaml', 'tts-server-1.yaml', 'nlp-server-1.yaml', 'stt-server-1.yaml'],
        '{"total_cpu": 33, "total_memory": 262, "total_gpu": 3, "total_storage": 1024}',
        '{"aws_monthly_usd": 6583, "ncp_monthly_krw": 80820000}',
        'completed', 100, '배포 완료',
        ARRAY['🚀 배포 시작', '✅ 네임스페이스 생성 완료', '✅ 매니페스트 적용 완료', '✅ 서비스 배포 완료', '✅ 헬스 체크 완료', '🎉 배포 완료'],
        NOW() - INTERVAL '1 hour',
        NOW() - INTERVAL '45 minutes'
      )
      ON CONFLICT DO NOTHING
    `);

    console.log('📊 추가 샘플 데이터 삽입 완료');
  }

  async close() {
    await this.pool.end();
  }
}

// [advice from AI] 스크립트 실행
if (require.main === module) {
  const initializer = new OperationsDBInitializer();
  
  initializer.initialize()
    .then(() => {
      console.log('✅ 운영 센터 데이터베이스 초기화 성공');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 초기화 실패:', error);
      process.exit(1);
    });
}

module.exports = OperationsDBInitializer;
