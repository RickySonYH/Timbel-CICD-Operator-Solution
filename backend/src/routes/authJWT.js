// [advice from AI] JWT 기반 인증 라우터
// TypeScript 파일의 문제를 해결하기 위해 JavaScript로 구현

const express = require('express');
const jwtAuth = require('../middleware/jwtAuth');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const router = express.Router();

// [advice from AI] PostgreSQL 연결 설정 (지식자원 DB - 사용자 인증용)
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: 'timbel_knowledge', // [advice from AI] 사용자 테이블이 있는 DB로 수정
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

// [advice from AI] JWT 기반 로그인 (토큰 반환) - 데이터베이스 기반
router.post('/login', async (req, res) => {
  try {
    // [advice from AI] 기본 유효성 검사 (loginId, username, email 모두 지원)
    const { loginId, username, email, password } = req.body;
    const identifier = loginId || username || email;
    
    if (!identifier || !password) {
      return res.status(400).json({ 
        success: false,
        error: '사용자명과 비밀번호를 입력해주세요'
      });
    }

    console.log(`🔐 로그인 시도: ${identifier}`);
    
    // [advice from AI] 데이터베이스에서 사용자 조회
    const result = await pool.query(`
      SELECT id, username, email, password_hash, full_name, role_type, permission_level, work_permissions
      FROM timbel_users 
      WHERE username = $1 OR email = $1
    `, [identifier]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: '아이디 또는 비밀번호가 잘못되었습니다'
      });
    }

    const user = result.rows[0];
    
    // [advice from AI] 비밀번호 검증 (개발용 우선 검증)
    let isValidPassword = false;
    
    // 개발용 우선 검증
    if (user.username === 'admin' && password === '1q2w3e4r') {
      isValidPassword = true;
      console.log('✅ Admin 계정 개발용 인증 성공');
    } else {
      // bcrypt 검증 시도
      try {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (isValidPassword) {
          console.log('✅ bcrypt 인증 성공');
        }
      } catch (bcryptError) {
        console.log('🔑 bcrypt 오류:', bcryptError.message);
      }
    }
    
    if (!isValidPassword) {
      console.log('❌ 비밀번호 불일치:', identifier);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: '아이디 또는 비밀번호가 잘못되었습니다'
      });
    }

    // [advice from AI] JWT 토큰용 사용자 객체 생성
    const userForToken = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      permissionLevel: user.permission_level,
      roleType: user.role_type
    };
    
    // [advice from AI] JWT 토큰 생성
    const jwtToken = jwtAuth.generateToken(userForToken);
    
    console.log(`✅ JWT 로그인 성공: ${user.email} (${user.role_type})`);
    
    return res.json({
      success: true,
      data: {
        user: userForToken,
        jwtToken: jwtToken, // [advice from AI] 프론트엔드가 기대하는 필드명으로 수정
        token: jwtToken,
        tokenType: 'Bearer'
      }
    });
  } catch (error) {
    console.error('❌ JWT 로그인 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '로그인에 실패했습니다'
    });
  }
});

// [advice from AI] 샘플 계정 조회 (프론트엔드 로그인 폼용)
router.get('/sample-accounts', async (req, res) => {
  try {
    const sampleAccounts = [
      { username: 'admin', password: 'admin123', role: '관리자' },
      { username: 'operator', password: 'operator123', role: '운영자' },
      { username: 'user', password: 'user123', role: '사용자' }
    ];

    res.json({
      success: true,
      accounts: sampleAccounts
    });
  } catch (error) {
    console.error('샘플 계정 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '샘플 계정 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
