// [advice from AI] STEP 1: 프로젝트 생성 테스트
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_knowledge',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] 테스트용 프로젝트 데이터
const testProjects = [
  {
    name: 'ECP-AI K8s Orchestrator',
    description: '멀티테넌트 AI 서비스 배포 시스템 - Kubernetes 오케스트레이션 솔루션',
    target_system_name: 'ecp-ai-k8s-orchestrator',
    project_overview: 'AI 서비스(콜봇, 챗봇, 어드바이저)를 위한 Kubernetes 기반 멀티테넌트 배포 플랫폼 구축',
    repository_url: 'https://github.com/RickySonYH/ecp-ai-k8s-orchestrator'
  },
  {
    name: 'Timbel Knowledge Management System',
    description: '통합 지식 관리 시스템 - 프로젝트, 문서, 코드 컴포넌트 통합 관리',
    target_system_name: 'timbel-knowledge-system',
    project_overview: 'React + Node.js 기반 엔터프라이즈 지식 관리 플랫폼',
    repository_url: 'https://github.com/timbel-dev/knowledge-system'
  },
  {
    name: 'AI 챗봇 서비스 플랫폼',
    description: 'GPT 기반 고객 상담 챗봇 서비스',
    target_system_name: 'ai-chatbot-platform',
    project_overview: 'OpenAI API를 활용한 실시간 고객 상담 챗봇 시스템',
    repository_url: 'https://github.com/timbel-dev/ai-chatbot'
  }
];

async function testProjectCreation() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 STEP 1: 프로젝트 생성 테스트 시작...\n');
    
    const createdProjects = [];
    
    for (let i = 0; i < testProjects.length; i++) {
      const project = testProjects[i];
      
      console.log(`📋 프로젝트 ${i + 1}: ${project.name}`);
      console.log(`   설명: ${project.description}`);
      
      // [advice from AI] 프로젝트 생성
      const projectId = uuidv4();
      
      try {
        await client.query(`
          INSERT INTO projects (
            id, name, description, target_system_name, project_overview,
            status, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, 'planning', NOW(), NOW())
        `, [
          projectId, project.name, project.description, 
          project.target_system_name, project.project_overview
        ]);
        
        console.log(`   ✅ 프로젝트 생성 완료 (ID: ${projectId.substring(0, 8)}...)`);
        console.log(`   📊 상태: planning (승인 대기 중)`);
        
        createdProjects.push({
          id: projectId,
          name: project.name,
          target_system_name: project.target_system_name,
          repository_url: project.repository_url
        });
        
      } catch (error) {
        console.log(`   ❌ 프로젝트 생성 실패: ${error.message}`);
      }
      
      console.log('');
    }
    
    // [advice from AI] 생성된 프로젝트 목록 확인
    console.log('📊 생성된 프로젝트 현황:');
    const projectsResult = await client.query(`
      SELECT id, name, target_system_name, status, created_at
      FROM projects 
      WHERE status = 'planning'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    projectsResult.rows.forEach((project, index) => {
      console.log(`   ${index + 1}. ${project.name}`);
      console.log(`      시스템명: ${project.target_system_name}`);
      console.log(`      상태: ${project.status}`);
      console.log(`      생성일: ${project.created_at.toISOString().split('T')[0]}`);
      console.log('');
    });
    
    console.log(`✅ 총 ${createdProjects.length}개 프로젝트 생성 완료`);
    console.log('\n🎯 다음 단계: STEP 2 - 최고운영자 승인');
    console.log('   실행 명령: node test-step2-admin-approval.js');
    
    return createdProjects;
    
  } catch (error) {
    console.error('❌ 프로젝트 생성 테스트 실패:', error);
    throw error;
  } finally {
    client.release();
  }
}

// [advice from AI] 실행
if (require.main === module) {
  testProjectCreation()
    .then(() => {
      console.log('\n🎉 STEP 1 테스트 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 STEP 1 테스트 실패:', error);
      process.exit(1);
    });
}

module.exports = { testProjectCreation, testProjects };
