// [advice from AI] JWT 기반 인증 라우터
// TypeScript 파일의 문제를 해결하기 위해 JavaScript로 구현

const express = require('express');
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] JWT 기반 로그인 (토큰 반환)
router.post('/login-jwt', async (req, res) => {
  try {
    // [advice from AI] 기본 유효성 검사
    if (!req.body.loginId || !req.body.password) {
      return res.status(400).json({ 
        success: false,
        error: '사용자명과 비밀번호를 입력해주세요'
      });
    }

    // [advice from AI] 모든 샘플 계정 인증 (하드코딩)
    const { loginId, password } = req.body;
    
    // [advice from AI] 샘플 계정 데이터베이스
    const users = {
      'admin': {
        id: 'admin-001',
        username: 'admin',
        email: 'admin@timbel.net',
        fullName: '시스템 관리자',
        permissionLevel: 5,
        roleType: 'admin'
      },
      'executive': {
        id: 'exec-001',
        username: 'executive',
        email: 'executive@timbel.com',
        fullName: '최고 관리자',
        permissionLevel: 5,
        roleType: 'executive'
      },
      'pouser': {
        id: 'po-001',
        username: 'pouser',
        email: 'po@timbel.com',
        fullName: 'PO (프로젝트 오너)',
        permissionLevel: 3,
        roleType: 'po'
      },
      'peuser': {
        id: 'pe-001',
        username: 'peuser',
        email: 'pe@timbel.com',
        fullName: 'PE (프로젝트 엔지니어)',
        permissionLevel: 2,
        roleType: 'pe'
      },
      'qauser': {
        id: 'qa-001',
        username: 'qauser',
        email: 'qa@timbel.com',
        fullName: 'QA/QC',
        permissionLevel: 2,
        roleType: 'qa'
      },
      'opuser': {
        id: 'op-001',
        username: 'opuser',
        email: 'operations@timbel.com',
        fullName: '운영팀 사용자',
        permissionLevel: 4,
        roleType: 'operations'
      }
    };
    
    // [advice from AI] 사용자 인증
    if (users[loginId] && password === '1q2w3e4r') {
      const user = users[loginId];
      
      // [advice from AI] JWT 토큰 생성
      const jwtToken = jwtAuth.generateToken(user);
      
      console.log(`✅ JWT 로그인 성공: ${user.email} (${user.roleType})`);
      
      return res.json({
        success: true,
        data: {
          user,
          token: jwtToken,
          tokenType: 'Bearer'
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        error: '잘못된 사용자명 또는 비밀번호입니다'
      });
    }
  } catch (error) {
    console.error('❌ JWT 로그인 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '로그인에 실패했습니다'
    });
  }
});

module.exports = router;
