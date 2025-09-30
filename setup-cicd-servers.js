#!/usr/bin/env node

// [advice from AI] CI/CD 서버 자동 등록 스크립트
const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';
const ADMIN_TOKEN = 'your-admin-jwt-token'; // 실제 토큰으로 교체 필요

const servers = [
  {
    server_name: 'Local Jenkins',
    server_type: 'jenkins',
    server_url: 'http://localhost:8080',
    username: 'admin',
    password: '1q2w3e4r'
  },
  {
    server_name: 'Local Nexus',
    server_type: 'nexus',
    server_url: 'http://localhost:8081',
    username: 'admin',
    password: 'admin123'
  },
  {
    server_name: 'Local Argo CD',
    server_type: 'argocd',
    server_url: 'http://localhost:8082',
    username: 'admin',
    password: 'admin'
  }
];

async function registerServers() {
  console.log('🚀 CI/CD 서버 등록 시작...');
  
  for (const server of servers) {
    try {
      console.log(`📝 ${server.server_name} 등록 중...`);
      
      const response = await axios.post(`${BACKEND_URL}/api/cicd-servers`, server, {
        headers: {
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        console.log(`✅ ${server.server_name} 등록 완료`);
        
        // 헬스 체크 실행
        const healthResponse = await axios.post(`${BACKEND_URL}/api/cicd-servers/${response.data.data.id}/health-check`, {}, {
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          }
        });
        
        if (healthResponse.data.success) {
          console.log(`🩺 ${server.server_name} 헬스 체크 완료: ${healthResponse.data.data.status}`);
        }
      }
      
    } catch (error) {
      console.error(`❌ ${server.server_name} 등록 실패:`, error.response?.data?.message || error.message);
    }
  }
  
  console.log('🎉 CI/CD 서버 등록 완료!');
}

// 스크립트 실행
if (require.main === module) {
  registerServers().catch(console.error);
}

module.exports = { registerServers };
