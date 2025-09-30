// [advice from AI] 기본 인프라 정보 등록 스크립트
// 이미지에 있는 인프라 정보들을 자동으로 등록

const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// 기본 인프라 정보 (이미지 기반)
const infrastructures = [
  {
    service_name: 'Nexus Repository',
    service_type: 'nexus',
    service_url: 'https://nexus.langsa.ai',
    environment: null, // 공통 사용
    username: 'admin',
    password: 'timbelNexus0901!',
    description: 'Container Registry 및 Artifact Repository',
    health_status: 'healthy'
  },
  {
    service_name: 'Docker Registry',
    service_type: 'docker_registry',
    service_url: 'https://docker.langsa.ai',
    environment: null, // 공통 사용
    username: 'docker',
    password: 'timbelDocker0901!',
    description: 'Docker Container Registry',
    health_status: 'healthy'
  },
  {
    service_name: 'Jenkins Admin',
    service_type: 'jenkins',
    service_url: 'https://jenkins.langsa.ai',
    environment: null, // 공통 사용
    username: 'admin',
    password: 'timbelJenkins0901!',
    description: 'CI/CD 빌드 서버 (관리자)',
    health_status: 'healthy'
  },
  {
    service_name: 'Jenkins AICC',
    service_type: 'jenkins',
    service_url: 'https://jenkins.langsa.ai',
    environment: null,
    username: 'aicc',
    password: 'ZAQ!2wsx',
    description: 'CI/CD 빌드 서버 (AICC 전용)',
    health_status: 'healthy'
  },
  {
    service_name: 'Argo CD Development',
    service_type: 'argocd',
    service_url: 'https://dev-ecp-argocd.langsa.ai',
    environment: 'development',
    username: 'admin',
    password: 'Lt95YrDQ4pfHR9za',
    description: 'GitOps 배포 관리 (개발 환경)',
    health_status: 'healthy'
  },
  {
    service_name: 'Argo CD Development (Developer)',
    service_type: 'argocd',
    service_url: 'https://dev-ecp-argocd.langsa.ai',
    environment: 'development',
    username: 'develop',
    password: 'ZAQ!2wsx',
    description: 'GitOps 배포 관리 (개발자 계정)',
    health_status: 'healthy'
  },
  {
    service_name: 'Argo CD Staging',
    service_type: 'argocd',
    service_url: 'https://stg-ecp-argocd.langsa.ai',
    environment: 'staging',
    username: 'admin',
    password: 'dNFPHhYXTuZMIiLG',
    description: 'GitOps 배포 관리 (스테이징 환경)',
    health_status: 'healthy'
  },
  {
    service_name: 'Argo CD Staging (Developer)',
    service_type: 'argocd',
    service_url: 'https://stg-ecp-argocd.langsa.ai',
    environment: 'staging',
    username: 'develop',
    password: 'ZAQ!2wsx',
    description: 'GitOps 배포 관리 (스테이징 개발자)',
    health_status: 'healthy'
  },
  {
    service_name: 'Argo CD Production',
    service_type: 'argocd',
    service_url: 'https://ecp-argocd.langsa.ai',
    environment: 'production',
    username: 'admin',
    password: 'Z80uxgeqBiPe7DbR',
    description: 'GitOps 배포 관리 (운영 환경)',
    health_status: 'healthy'
  },
  {
    service_name: 'Argo CD Production (Developer)',
    service_type: 'argocd',
    service_url: 'https://ecp-argocd.langsa.ai',
    environment: 'production',
    username: 'develop',
    password: 'ZAQ!2wsx',
    description: 'GitOps 배포 관리 (운영 개발자)',
    health_status: 'healthy'
  }
];

// 관리자 토큰 (임시 - 실제로는 로그인 후 토큰 획득)
let adminToken = null;

// 관리자 로그인
async function loginAsAdmin() {
  try {
    console.log('🔐 관리자 로그인 시도...');
    
    const response = await axios.post(`${API_BASE}/api/auth/login`, {
      username: 'admin',
      password: 'admin123' // 기본 관리자 비밀번호
    });
    
    if (response.data.success) {
      adminToken = response.data.token;
      console.log('✅ 관리자 로그인 성공');
      return true;
    } else {
      console.error('❌ 관리자 로그인 실패:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ 로그인 오류:', error.message);
    return false;
  }
}

// 인프라 등록
async function registerInfrastructure(infra) {
  try {
    console.log(`📡 인프라 등록 중: ${infra.service_name}`);
    
    const response = await axios.post(`${API_BASE}/api/deployment-infrastructure`, infra, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log(`✅ ${infra.service_name} 등록 완료`);
      return true;
    } else {
      console.error(`❌ ${infra.service_name} 등록 실패:`, response.data.message);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 409) {
      console.log(`⚠️ ${infra.service_name} 이미 존재함 (건너뜀)`);
      return true;
    } else {
      console.error(`❌ ${infra.service_name} 등록 오류:`, error.message);
      return false;
    }
  }
}

// 메인 실행 함수
async function main() {
  console.log('🚀 기본 인프라 정보 등록 시작...');
  console.log(`📊 등록할 인프라 수: ${infrastructures.length}개`);
  
  // 서버 연결 확인
  try {
    await axios.get(`${API_BASE}/health`);
    console.log('✅ 백엔드 서버 연결 확인');
  } catch (error) {
    console.error('❌ 백엔드 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.');
    process.exit(1);
  }
  
  // 관리자 로그인
  const loginSuccess = await loginAsAdmin();
  if (!loginSuccess) {
    console.error('❌ 관리자 로그인에 실패했습니다.');
    process.exit(1);
  }
  
  // 인프라 등록
  let successCount = 0;
  let failCount = 0;
  
  for (const infra of infrastructures) {
    const success = await registerInfrastructure(infra);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // 요청 간 간격
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📊 등록 결과:');
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`📋 전체: ${infrastructures.length}개`);
  
  if (failCount === 0) {
    console.log('\n🎉 모든 인프라 정보가 성공적으로 등록되었습니다!');
  } else {
    console.log('\n⚠️ 일부 인프라 등록에 실패했습니다. 로그를 확인하세요.');
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 스크립트 실행 오류:', error);
    process.exit(1);
  });
}

module.exports = { infrastructures, registerInfrastructure };
