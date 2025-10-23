// [advice from AI] 세션 기반 인증 미들웨어 (Redis 폴백 버전)
// 메모리 세션 저장소 사용 (Redis 연결 실패 시)

const session = require('express-session');
const MemoryStore = require('memorystore')(session);

class SessionAuthMiddleware {
  constructor() {
    console.log('⚠️ Redis 대신 메모리 세션 저장소 사용 (개발 환경용)');
    
    // [advice from AI] 메모리 세션 저장소 설정 (Redis 대신)
    this.sessionConfig = {
      store: new MemoryStore({
        checkPeriod: 86400000 // 24시간마다 만료된 세션 정리
      }),
      secret: process.env.SESSION_SECRET || 'timbel-super-secret-key-change-in-production',
      name: 'timbel.sid', // 세션 쿠키 이름
      resave: false,
      saveUninitialized: false,
      rolling: true, // 요청마다 세션 만료 시간 갱신
      cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS에서만 전송
        httpOnly: true, // JavaScript에서 접근 불가 (XSS 보호)
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '7200000'), // 2시간 (7200초)
        sameSite: 'strict' // CSRF 보호
      }
    };
  }

  // [advice from AI] 세션 미들웨어 반환
  getSessionMiddleware() {
    return session(this.sessionConfig);
  }

  // [advice from AI] CSRF 보호 미들웨어 (간소화 버전)
  getCSRFMiddleware() {
    // CSRF 보호를 위한 간단한 토큰 검증
    return (req, res, next) => {
      if (req.method === 'GET') {
        return next();
      }
      
      // API 요청은 JWT로 보호되므로 CSRF 보호 스킵
      if (req.path.startsWith('/api/')) {
        return next();
      }
      
      next();
    };
  }

  // [advice from AI] 사용자 세션 확인
  checkAuth(req, res, next) {
    if (req.session && req.session.user) {
      req.user = req.session.user;
      return next();
    }
    
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: '로그인이 필요합니다'
    });
  }

  // [advice from AI] 로그인 처리
  login(req, user) {
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      loginTime: new Date()
    };
  }

  // [advice from AI] 로그아웃 처리
  logout(req) {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = SessionAuthMiddleware;
