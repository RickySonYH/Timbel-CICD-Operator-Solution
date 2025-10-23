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

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: 사용자 로그인
 *     description: |
 *       사용자명/이메일과 비밀번호를 사용하여 JWT 토큰을 발급받습니다.
 *       성공 시 JWT 토큰과 사용자 정보를 반환합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               loginId:
 *                 type: string
 *                 description: 로그인 ID (사용자명 또는 이메일)
 *                 example: admin
 *               username:
 *                 type: string
 *                 description: 사용자명
 *                 example: admin
 *               email:
 *                 type: string
 *                 format: email
 *                 description: 이메일 주소
 *                 example: admin@timbel.net
 *               password:
 *                 type: string
 *                 description: 비밀번호
 *                 example: 1q2w3e4r
 *           examples:
 *             admin_login:
 *               summary: 관리자 계정으로 로그인
 *               value:
 *                 loginId: admin
 *                 password: 1q2w3e4r
 *             email_login:
 *               summary: 이메일로 로그인
 *               value:
 *                 email: admin@timbel.net
 *                 password: 1q2w3e4r
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     jwtToken:
 *                       type: string
 *                       description: JWT 액세스 토큰
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     token:
 *                       type: string
 *                       description: JWT 토큰 (jwtToken과 동일)
 *                       example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                     tokenType:
 *                       type: string
 *                       example: Bearer
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: 로그인 실패 (잘못된 자격 증명)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               error: Invalid credentials
 *               message: 아이디 또는 비밀번호가 잘못되었습니다
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *     security: []
 */
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
    
    // [advice from AI] 데이터베이스에서 사용자 조회 - role 컬럼으로 수정
    const result = await pool.query(`
      SELECT id, username, email, password_hash, full_name, role, permission_level, work_permissions
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

    // [advice from AI] JWT 토큰용 사용자 객체 생성 - role 컬럼 사용
    const userForToken = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      permissionLevel: user.permission_level,
      roleType: user.role // role 컬럼을 roleType으로 매핑
    };
    
    // [advice from AI] JWT 토큰 생성
    const jwtToken = jwtAuth.generateToken(userForToken);
    
    console.log(`✅ JWT 로그인 성공: ${user.email} (${user.role})`);
    
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

// [advice from AI] 샘플 계정 목록 API (개발/데모용)
router.get('/sample-accounts', async (req, res) => {
  try {
    console.log('📋 샘플 계정 목록 요청');
    
    // [advice from AI] 실제 데이터베이스에서 샘플 계정 조회
    const result = await pool.query(`
      SELECT username, email, role, full_name
      FROM timbel_users 
      WHERE username IN ('admin', 'demo', 'test') 
      ORDER BY 
        CASE username 
          WHEN 'admin' THEN 1
          WHEN 'demo' THEN 2
          WHEN 'test' THEN 3
          ELSE 4
        END
      LIMIT 5
    `);
    
    // [advice from AI] 기본 샘플 계정 (DB에 없는 경우)
    let sampleAccounts = [
      {
        username: 'admin',
        email: 'admin@timbel.net',
        role: 'admin',
        full_name: '시스템 관리자',
        password: '1q2w3e4r'
      }
    ];
    
    // DB에서 가져온 계정이 있으면 사용
    if (result.rows.length > 0) {
      sampleAccounts = result.rows.map(user => ({
        username: user.username,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        password: user.username === 'admin' ? '1q2w3e4r' : 'demo1234'
      }));
    }
    
    console.log('✅ 샘플 계정 목록 반환:', sampleAccounts.length, '개');
    
    res.json({
      success: true,
      accounts: sampleAccounts
    });
    
  } catch (error) {
    console.error('❌ 샘플 계정 조회 오류:', error);
    
    // [advice from AI] 에러 시에도 기본 계정 반환 (가용성 향상)
    res.json({
      success: true,
      accounts: [
        {
          username: 'admin',
          email: 'admin@timbel.net', 
          role: 'admin',
          full_name: '시스템 관리자',
          password: '1q2w3e4r'
        }
      ]
    });
  }
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: JWT 토큰 갱신
 *     description: 유효한 JWT 토큰을 사용하여 새로운 토큰을 발급받습니다.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 토큰 갱신 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 토큰이 성공적으로 갱신되었습니다
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     jwtToken:
 *                       type: string
 *                       description: 새로 발급된 JWT 토큰
 *                     token:
 *                       type: string
 *                       description: jwtToken과 동일
 *                     tokenType:
 *                       type: string
 *                       example: Bearer
 *                     expiresIn:
 *                       type: string
 *                       example: 24h
 *                     issuedAt:
 *                       type: string
 *                       format: date-time
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: 인증 실패 (토큰 없음, 만료됨, 또는 유효하지 않음)
 *       500:
 *         description: 서버 오류
 */
router.post('/refresh', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔄 토큰 갱신 요청:', req.user?.username);

    // [advice from AI] 현재 토큰의 사용자 정보 확인
    const currentUser = req.user;
    if (!currentUser || !currentUser.id) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 사용자 정보입니다.'
      });
    }

    // [advice from AI] 데이터베이스에서 최신 사용자 정보 조회
    const userResult = await pool.query(
      `SELECT 
        id, username, email, full_name, permission_level, role_type, 
        is_active, created_at, updated_at
      FROM users 
      WHERE id = $1 AND is_active = true`,
      [currentUser.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: '사용자를 찾을 수 없거나 비활성화된 계정입니다.'
      });
    }

    const user = userResult.rows[0];
    
    // [advice from AI] 새로운 토큰 생성을 위한 사용자 정보 구성
    const userForToken = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      permissionLevel: user.permission_level,
      roleType: user.role_type
    };

    // [advice from AI] 새로운 JWT 토큰 생성
    const newJwtToken = jwtAuth.generateToken(userForToken);
    
    // [advice from AI] 토큰 발급 시간 및 만료 시간 계산
    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + (24 * 60 * 60 * 1000)); // 24시간 후
    
    // [advice from AI] 토큰 갱신 로그 기록 (선택사항)
    try {
      await pool.query(
        `INSERT INTO user_activity_logs (user_id, action, details, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          user.id,
          'token_refresh',
          JSON.stringify({ 
            refreshed_at: issuedAt.toISOString(),
            expires_at: expiresAt.toISOString()
          }),
          req.ip || req.connection.remoteAddress,
          req.get('User-Agent') || 'Unknown'
        ]
      );
    } catch (logError) {
      // [advice from AI] 로그 기록 실패는 토큰 갱신에 영향을 주지 않음
      console.warn('토큰 갱신 로그 기록 실패:', logError.message);
    }

    console.log('✅ 토큰 갱신 성공:', user.username);

    res.json({
      success: true,
      message: '토큰이 성공적으로 갱신되었습니다.',
      data: {
        user: userForToken,
        jwtToken: newJwtToken,
        token: newJwtToken,
        tokenType: 'Bearer',
        expiresIn: '24h',
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString()
      }
    });

  } catch (error) {
    console.error('❌ 토큰 갱신 오류:', error);
    res.status(500).json({
      success: false,
      message: '토큰 갱신 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
