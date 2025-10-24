// [advice from AI] 고급 Rate Limiting 미들웨어 (사용자/역할별)
// Redis 기반 분산 Rate Limiting

const redis = require('redis');

class AdvancedRateLimiter {
  constructor() {
    this.redisClient = null;
    this.enabled = process.env.REDIS_ENABLED === 'true';
    
    if (this.enabled) {
      this.initializeRedis();
    } else {
      console.warn('⚠️  Redis Rate Limiting 비활성화 (REDIS_ENABLED=false)');
    }

    // [advice from AI] 역할별 Rate Limit 설정 (requests per minute)
    this.roleLimits = {
      admin: 1000,        // 관리자: 1000 req/min
      operations: 300,    // 운영자: 300 req/min
      developer: 100,     // 개발자: 100 req/min
      viewer: 30,         // 뷰어: 30 req/min
      default: 60         // 기본: 60 req/min
    };

    // [advice from AI] IP 기반 Rate Limit (인증되지 않은 요청)
    this.ipLimit = 20; // 20 req/min
  }

  /**
   * Redis 초기화
   */
  async initializeRedis() {
    try {
      const redisConfig = {
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB || 0
      };

      this.redisClient = redis.createClient(redisConfig);

      this.redisClient.on('error', (err) => {
        console.error('❌ Redis 연결 오류:', err);
        this.enabled = false;
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis 연결 성공 (Rate Limiting)');
      });

      await this.redisClient.connect();
    } catch (error) {
      console.error('❌ Redis 초기화 실패:', error);
      this.enabled = false;
    }
  }

  /**
   * Rate Limit 체크 (미들웨어)
   */
  checkLimit() {
    return async (req, res, next) => {
      // Redis가 비활성화된 경우 통과
      if (!this.enabled || !this.redisClient) {
        return next();
      }

      try {
        const identifier = this.getIdentifier(req);
        const limit = this.getLimit(req);
        const key = `rate_limit:${identifier}`;

        // 현재 요청 횟수 조회
        const current = await this.redisClient.get(key);
        const requestCount = current ? parseInt(current) : 0;

        // Rate Limit 초과 체크
        if (requestCount >= limit) {
          console.warn(`⚠️  Rate Limit 초과: ${identifier} (${requestCount}/${limit})`);
          return res.status(429).json({
            success: false,
            error: 'TooManyRequests',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: 60 // 60초 후 재시도
          });
        }

        // 요청 횟수 증가
        const newCount = requestCount + 1;
        
        if (requestCount === 0) {
          // 첫 요청: TTL 60초로 설정
          await this.redisClient.setEx(key, 60, newCount.toString());
        } else {
          // 기존 요청: 값만 증가
          await this.redisClient.set(key, newCount.toString(), { KEEPTTL: true });
        }

        // 응답 헤더에 Rate Limit 정보 추가
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', limit - newCount);
        res.setHeader('X-RateLimit-Reset', Date.now() + 60000);

        next();
      } catch (error) {
        console.error('❌ Rate Limit 체크 실패:', error);
        // 에러 발생 시 요청 통과 (Graceful Degradation)
        next();
      }
    };
  }

  /**
   * 사용자 식별자 추출
   */
  getIdentifier(req) {
    // 인증된 사용자
    if (req.user && req.user.id) {
      return `user:${req.user.id}`;
    }

    // IP 주소
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Rate Limit 계산
   */
  getLimit(req) {
    // 인증된 사용자: 역할 기반
    if (req.user && req.user.role) {
      return this.roleLimits[req.user.role] || this.roleLimits.default;
    }

    // 인증되지 않은 사용자: IP 기반
    return this.ipLimit;
  }

  /**
   * 특정 사용자의 Rate Limit 초기화
   */
  async resetLimit(identifier) {
    if (!this.enabled || !this.redisClient) {
      return { success: false, message: 'Redis not enabled' };
    }

    try {
      const key = `rate_limit:${identifier}`;
      await this.redisClient.del(key);
      console.log(`✅ Rate Limit 초기화: ${identifier}`);
      return { success: true, message: 'Rate limit reset' };
    } catch (error) {
      console.error('❌ Rate Limit 초기화 실패:', error);
      throw error;
    }
  }

  /**
   * 현재 Rate Limit 상태 조회
   */
  async getStatus(identifier) {
    if (!this.enabled || !this.redisClient) {
      return { 
        success: false, 
        message: 'Redis not enabled',
        enabled: false
      };
    }

    try {
      const key = `rate_limit:${identifier}`;
      const current = await this.redisClient.get(key);
      const ttl = await this.redisClient.ttl(key);

      return {
        success: true,
        enabled: true,
        identifier,
        currentRequests: current ? parseInt(current) : 0,
        resetIn: ttl > 0 ? ttl : 0
      };
    } catch (error) {
      console.error('❌ Rate Limit 상태 조회 실패:', error);
      throw error;
    }
  }

  /**
   * Redis 연결 종료
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('✅ Redis 연결 종료');
    }
  }
}

module.exports = new AdvancedRateLimiter();

