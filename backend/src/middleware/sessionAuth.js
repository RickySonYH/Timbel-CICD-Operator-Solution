// [advice from AI] 세션 기반 인증 미들웨어
// httpOnly 쿠키, Redis 세션 저장소, CSRF 보호

const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const csrf = require('csurf');

class SessionAuthMiddleware {
  constructor() {
    // [advice from AI] Redis 클라이언트 설정
    this.redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || undefined
    });

    this.redisClient.on('error', (err) => {
      console.error('Redis 연결 오류:', err);
    });

    this.redisClient.on('connect', () => {
      console.log('✅ Redis 세션 저장소 연결 성공');
    });

    // [advice from AI] Redis 연결
    this.redisClient.connect().catch(console.error);

    // [advice from AI] 세션 설정
    this.sessionConfig = {
      store: new RedisStore({ client: this.redisClient }),
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

    // [advice from AI] CSRF 보호 설정
    this.csrfProtection = csrf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      }
    });
  }

  // [advice from AI] 세션 미들웨어 반환
  getSessionMiddleware() {
    return session(this.sessionConfig);
  }

  // [advice from AI] CSRF 보호 미들웨어 반환
  getCsrfMiddleware() {
    return this.csrfProtection;
  }

  // [advice from AI] 인증 검사 미들웨어
  requireAuth(req, res, next) {
    if (req.session && req.session.user) {
      // [advice from AI] 세션 활동 시간 업데이트
      req.session.lastActivity = new Date().toISOString();
      return next();
    }
    
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: '로그인이 필요합니다'
    });
  }

  // [advice from AI] 권한 검사 미들웨어
  requirePermission(minLevel) {
    return (req, res, next) => {
      if (!req.session || !req.session.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: '로그인이 필요합니다'
        });
      }

      const userLevel = req.session.user.permissionLevel || 999;
      if (userLevel > minLevel) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: '권한이 부족합니다'
        });
      }

      return next();
    };
  }

  // [advice from AI] 세션 정리 (로그아웃)
  async destroySession(req) {
    return new Promise((resolve, reject) => {
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error('세션 삭제 오류:', err);
            reject(err);
          } else {
            resolve(true);
          }
        });
      } else {
        resolve(true);
      }
    });
  }

  // [advice from AI] 모든 사용자 세션 무효화 (보안 사고 시)
  async invalidateAllSessions() {
    try {
      const keys = await this.redisClient.keys('sess:*');
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        console.log(`🔒 ${keys.length}개의 세션이 무효화되었습니다`);
      }
      return { success: true, invalidated: keys.length };
    } catch (error) {
      console.error('전체 세션 무효화 오류:', error);
      throw error;
    }
  }

  // [advice from AI] 세션 통계 조회
  async getSessionStats() {
    try {
      const keys = await this.redisClient.keys('sess:*');
      const activeSessions = keys.length;
      
      return {
        success: true,
        data: {
          active_sessions: activeSessions,
          session_timeout: this.sessionConfig.cookie.maxAge / 1000, // 초 단위
          last_updated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('세션 통계 조회 오류:', error);
      throw error;
    }
  }
}

module.exports = SessionAuthMiddleware;
