// [advice from AI] systems 테이블에 PE 테스트 데이터 생성
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] PE별 테스트 시스템 데이터
const testSystems = [
  {
    name: 'ecp-ai-k8s-orchestrator',
    title: 'ECP-AI K8s Orchestrator',
    description: '멀티테넌트 AI 서비스 배포 시스템',
    version: '2.0.0',
    category: 'platform',
    tech_stack: ['Python', 'TypeScript', 'Kubernetes', 'Docker'],
    programming_languages: ['Python', 'TypeScript', 'JavaScript'],
    frameworks: ['FastAPI', 'React', 'Material-UI'],
    databases: ['PostgreSQL'],
    source_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator',
    lifecycle: 'production',
    deployment_status: 'production'
  },
  {
    name: 'timbel-knowledge-system',
    title: 'Timbel Knowledge Management System',
    description: '통합 지식 관리 시스템',
    version: '1.5.2',
    category: 'application',
    tech_stack: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
    programming_languages: ['JavaScript', 'TypeScript', 'SQL'],
    frameworks: ['React', 'Express.js', 'Material-UI'],
    databases: ['PostgreSQL', 'Redis'],
    source_url: 'https://github.com/timbel-dev/knowledge-system',
    lifecycle: 'production',
    deployment_status: 'production'
  },
  {
    name: 'ai-chatbot-platform',
    title: 'AI 챗봇 서비스 플랫폼',
    description: 'GPT 기반 고객 상담 챗봇 서비스',
    version: '1.2.0',
    category: 'service',
    tech_stack: ['Python', 'React', 'OpenAI API', 'WebSocket'],
    programming_languages: ['Python', 'JavaScript'],
    frameworks: ['FastAPI', 'React', 'Socket.io'],
    databases: ['PostgreSQL', 'Redis'],
    source_url: 'https://github.com/timbel-dev/ai-chatbot',
    lifecycle: 'development',
    deployment_status: 'staging'
  },
  {
    name: 'microservice-api-gateway',
    title: '마이크로서비스 API 게이트웨이',
    description: '통합 API 게이트웨이 및 인증 시스템',
    version: '1.0.3',
    category: 'infrastructure',
    tech_stack: ['Go', 'Redis', 'JWT', 'Docker'],
    programming_languages: ['Go'],
    frameworks: ['Gin', 'gRPC'],
    databases: ['Redis', 'PostgreSQL'],
    source_url: 'https://github.com/timbel-dev/api-gateway',
    lifecycle: 'production',
    deployment_status: 'production'
  },
  {
    name: 'realtime-monitoring-dashboard',
    title: '실시간 모니터링 대시보드',
    description: 'Kubernetes 클러스터 실시간 모니터링',
    version: '2.1.0',
    category: 'monitoring',
    tech_stack: ['React', 'Node.js', 'Grafana', 'Prometheus'],
    programming_languages: ['TypeScript', 'JavaScript'],
    frameworks: ['React', 'Express.js', 'D3.js'],
    databases: ['InfluxDB', 'PostgreSQL'],
    source_url: 'https://github.com/timbel-dev/monitoring-dashboard',
    lifecycle: 'production',
    deployment_status: 'production'
  },
  {
    name: 'cicd-automation-pipeline',
    title: 'CI/CD 자동화 파이프라인',
    description: 'Jenkins와 Argo CD 연동 자동화 시스템',
    version: '1.3.1',
    category: 'devops',
    tech_stack: ['Jenkins', 'Argo CD', 'Kubernetes', 'Helm'],
    programming_languages: ['Groovy', 'YAML', 'Bash'],
    frameworks: ['Jenkins Pipeline', 'Helm'],
    databases: ['PostgreSQL'],
    source_url: 'https://github.com/timbel-dev/cicd-automation',
    lifecycle: 'production',
    deployment_status: 'production'
  }
];

async function createSystemsTestData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 systems 테이블 PE 테스트 데이터 생성 시작...\n');
    
    // [advice from AI] PE 사용자들 조회
    const peUsersResult = await client.query(`
      SELECT id, full_name, email 
      FROM timbel_users 
      WHERE role_type = 'pe'
      ORDER BY full_name
    `);
    
    if (peUsersResult.rows.length === 0) {
      console.log('❌ PE 사용자가 없습니다.');
      return;
    }
    
    console.log(`👥 PE 사용자 ${peUsersResult.rows.length}명 확인:`);
    peUsersResult.rows.forEach((pe, index) => {
      console.log(`   ${index + 1}. ${pe.full_name} (${pe.email})`);
    });
    console.log('');
    
    // [advice from AI] 도메인 조회 (없으면 생성)
    let domainResult = await client.query(`
      SELECT id FROM domains WHERE name = 'AI 플랫폼' LIMIT 1
    `);
    
    let domainId;
    if (domainResult.rows.length === 0) {
      // 도메인 생성
      const newDomainResult = await client.query(`
        INSERT INTO domains (
          id, name, description, status, created_at, updated_at
        ) VALUES ($1, 'AI 플랫폼', 'AI 및 머신러닝 플랫폼 서비스', 'active', NOW(), NOW())
        RETURNING id
      `, [uuidv4()]);
      domainId = newDomainResult.rows[0].id;
      console.log('✅ AI 플랫폼 도메인 생성 완료');
    } else {
      domainId = domainResult.rows[0].id;
      console.log('✅ 기존 AI 플랫폼 도메인 사용');
    }
    
    const createdSystems = [];
    
    // [advice from AI] 각 PE에게 시스템 할당
    for (let i = 0; i < testSystems.length && i < peUsersResult.rows.length; i++) {
      const system = testSystems[i];
      const assignedPE = peUsersResult.rows[i];
      
      console.log(`📋 시스템 ${i + 1}: ${system.title}`);
      console.log(`   담당 PE: ${assignedPE.full_name}`);
      
      try {
        const systemId = uuidv4();
        
        await client.query(`
          INSERT INTO systems (
            id, domain_id, name, description, version, status,
            primary_contact, technical_lead, business_owner, created_by,
            approval_status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $7, $7, $7, 'approved', NOW(), NOW()
          )
        `, [
          systemId, domainId, system.name, system.description,
          system.version, system.lifecycle, assignedPE.id
        ]);
        
        console.log(`   ✅ 시스템 생성 완료 (ID: ${systemId.substring(0, 8)}...)`);
        console.log(`   📊 상태: ${system.lifecycle} / ${system.deployment_status}`);
        
        createdSystems.push({
          id: systemId,
          name: system.name,
          title: system.title,
          assigned_pe: assignedPE.full_name,
          pe_id: assignedPE.id
        });
        
      } catch (error) {
        console.log(`   ❌ 시스템 생성 실패: ${error.message}`);
      }
      
      console.log('');
    }
    
    // [advice from AI] 생성된 시스템 현황 확인
    console.log('📊 생성된 시스템 현황:');
    const systemsResult = await client.query(`
      SELECT 
        s.id, s.name, s.description, s.status, s.version,
        pe.full_name as pe_name,
        s.created_at
      FROM systems s
      LEFT JOIN timbel_users pe ON s.technical_lead = pe.id
      WHERE s.created_at >= NOW() - INTERVAL '1 hour'
      ORDER BY s.created_at DESC
    `);
    
    systemsResult.rows.forEach((system, index) => {
      console.log(`   ${index + 1}. ${system.name}`);
      console.log(`      설명: ${system.description}`);
      console.log(`      담당 PE: ${system.pe_name || '미할당'}`);
      console.log(`      상태: ${system.status} (v${system.version})`);
      console.log(`      생성일: ${system.created_at.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    console.log(`✅ 총 ${createdSystems.length}개 시스템 생성 완료`);
    console.log('\n🎯 이제 PE 대시보드에서 시스템 목록을 확인할 수 있습니다!');
    console.log('   프론트엔드에서 PE 사용자로 로그인하여 확인해보세요.');
    
    return createdSystems;
    
  } catch (error) {
    console.error('❌ 시스템 테스트 데이터 생성 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// [advice from AI] 실행
if (require.main === module) {
  createSystemsTestData()
    .then(() => {
      console.log('\n🎉 시스템 테스트 데이터 생성 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 시스템 테스트 데이터 생성 실패:', error);
      process.exit(1);
    });
}

module.exports = { createSystemsTestData };
