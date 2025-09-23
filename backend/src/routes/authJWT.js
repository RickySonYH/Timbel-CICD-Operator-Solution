// [advice from AI] JWT 기반 인증 라우터
// TypeScript 파일의 문제를 해결하기 위해 JavaScript로 구현

const express = require('express');
const jwtAuth = require('../middleware/jwtAuth');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const router = express.Router();

// [advice from AI] PostgreSQL 연결 설정
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_db',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

// [advice from AI] JWT 기반 로그인 (토큰 반환) - 데이터베이스 기반
router.post('/login-jwt', async (req, res) => {
  try {
    // [advice from AI] 기본 유효성 검사
    if (!req.body.username || !req.body.password) {
      return res.status(400).json({ 
        success: false,
        error: '사용자명과 비밀번호를 입력해주세요'
      });
    }

    const { username, password } = req.body;
    
    // [advice from AI] 데이터베이스에서 사용자 조회
    const result = await pool.query(`
      SELECT id, username, email, password_hash, full_name, role_type, permission_level, work_permissions
      FROM timbel_users 
      WHERE username = $1 OR email = $1
    `, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: '아이디 또는 비밀번호가 잘못되었습니다'
      });
    }

    const user = result.rows[0];
    
    // [advice from AI] 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
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

module.exports = router;
