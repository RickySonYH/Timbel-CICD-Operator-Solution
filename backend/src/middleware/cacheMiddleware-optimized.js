// [advice from AI] 최적화된 Redis 캐시 미들웨어 (프로덕션 레벨)
// Redis + 메모리 하이브리드 캐싱 시스템

const redis = require('redis');
const crypto = require('crypto');
const systemLogger = require('./systemLogger');

class OptimizedCacheManager {
  constructor() {
    this.redisClient = null;
    this.isRedisConnected = false;
    this.memoryCache = new Map(); // L1 캐시 (메모리)
    this.defaultTTL = 300; // 5분 기본 TTL
    this.maxMemoryCacheSize = 1000; // 메모리 캐시 최대 크기
    
    // [advice from AI] 캐시 정책 설정 (계층별)
    this.cacheConfig = {
      // L1 (메모리) + L2 (Redis) 캐시
      'static': { ttl: 3600, useMemory: true, useRedis: true },      // 1시간
      'reference': { ttl: 1800, useMemory: true, useRedis: true },   // 30분
      'dashboard': { ttl: 300, useMemory: true, useRedis: false },   // 5분 (메모리만)
      'realtime': { ttl: 60, useMemory: true, useRedis: false },     // 1분 (메모리만)
      'statistics': { ttl: 600, useMemory: false, useRedis: true },  // 10분 (Redis만)
      'user_data': { ttl: 900, useMemory: true, useRedis: true },    // 15분
      'search': { ttl: 180, useMemory: true, useRedis: false },      // 3분 (메모리만)
    };
    
    this.stats = {
      l1_hits: 0,    // 메모리 캐시 히트
      l2_hits: 0,    // Redis 캐시 히트
      misses: 0,     // 캐시 미스
      errors: 0      // 오류 횟수
    };
    
    this.init();
    this.setupCleanup();
  }

  async init() {
    try {
      // [advice from AI] Redis 클라이언트 설정 (최신 방식)
      this.redisClient = redis.createClient({
        url: process.env.REDIS_URL || 'redis://redis:6379',
        password: process.env.REDIS_PASSWORD,
        database: parseInt(process.env.REDIS_CACHE_DB || '1'),
        socket: {
          connectTimeout: 5000,
          lazyConnect: true
        },
        retry: {
          retries: 3,
          delay: (retryCount) => Math.min(retryCount * 50, 500)
        }
      });

      this.redisClient.on('connect', () => {
        console.log('✅ Redis 캐시 서버 연결됨');
        this.isRedisConnected = true;
      });

      this.redisClient.on('error', (err) => {
        console.warn('⚠️ Redis 캐시 오류:', err.message);
        this.isRedisConnected = false;
        this.stats.errors++;
      });

      this.redisClient.on('end', () => {
        console.log('🔌 Redis 캐시 연결 종료됨');
        this.isRedisConnected = false;
      });

      await this.redisClient.connect();
      
    } catch (error) {
      console.warn('⚠️ Redis 캐시 초기화 실패, 메모리 캐시만 사용:', error.message);
      this.isRedisConnected = false;
    }
  }

  // [advice from AI] 메모리 캐시 정리 (메모리 누수 방지)
  setupCleanup() {
    setInterval(() => {
      const now = Date.now();
      
      // 만료된 항목 제거
      for (const [key, value] of this.memoryCache.entries()) {
        if (now > value.expiry) {
          this.memoryCache.delete(key);
        }
      }
      
      // 크기 제한 (LRU 방식)
      if (this.memoryCache.size > this.maxMemoryCacheSize) {
        const entries = Array.from(this.memoryCache.entries());
        entries.sort((a, b) => a[1].lastAccess - b[1].lastAccess);
        
        const removeCount = this.memoryCache.size - this.maxMemoryCacheSize + 100;
        for (let i = 0; i < removeCount && i < entries.length; i++) {
          this.memoryCache.delete(entries[i][0]);
        }
      }
    }, 60000); // 1분마다 정리
  }

  // [advice from AI] 캐시 키 생성
  generateCacheKey(req, customKey = null) {
    if (customKey) return `api:${customKey}`;
    
    const userId = req.user?.id || 'anonymous';
    const path = req.originalUrl;
    const method = req.method;
    const query = JSON.stringify(req.query);
    
    const keyString = `${method}:${path}:${query}:${userId}`;
    return `api:${crypto.createHash('md5').update(keyString).digest('hex')}`;
  }

  // [advice from AI] L1 캐시 (메모리) 조회
  getFromMemory(key) {
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() < cached.expiry) {
      cached.lastAccess = Date.now(); // LRU 업데이트
      this.stats.l1_hits++;
      return cached.data;
    }
    
    if (cached) {
      this.memoryCache.delete(key); // 만료된 항목 제거
    }
    
    return null;
  }

  // [advice from AI] L1 캐시 (메모리) 저장
  setToMemory(key, data, ttl) {
    const now = Date.now();
    this.memoryCache.set(key, {
      data,
      created: now,
      expiry: now + (ttl * 1000),
      lastAccess: now
    });
  }

  // [advice from AI] L2 캐시 (Redis) 조회
  async getFromRedis(key) {
    if (!this.isRedisConnected) return null;
    
    try {
      const data = await this.redisClient.get(key);
      if (data) {
        this.stats.l2_hits++;
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Redis 조회 오류:', error.message);
      this.stats.errors++;
    }
    
    return null;
  }

  // [advice from AI] L2 캐시 (Redis) 저장
  async setToRedis(key, data, ttl) {
    if (!this.isRedisConnected) return;
    
    try {
      await this.redisClient.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.warn('Redis 저장 오류:', error.message);
      this.stats.errors++;
    }
  }

  // [advice from AI] 통합 캐시 조회
  async get(key, cacheType = 'dashboard') {
    const config = this.cacheConfig[cacheType] || this.cacheConfig.dashboard;
    
    // L1 캐시 (메모리) 먼저 확인
    if (config.useMemory) {
      const memoryResult = this.getFromMemory(key);
      if (memoryResult !== null) {
        return memoryResult;
      }
    }
    
    // L2 캐시 (Redis) 확인
    if (config.useRedis) {
      const redisResult = await this.getFromRedis(key);
      if (redisResult !== null) {
        // Redis에서 가져온 데이터를 메모리 캐시에도 저장 (캐시 워밍)
        if (config.useMemory) {
          this.setToMemory(key, redisResult, Math.min(config.ttl, 300)); // 최대 5분
        }
        return redisResult;
      }
    }
    
    this.stats.misses++;
    return null;
  }

  // [advice from AI] 통합 캐시 저장
  async set(key, data, cacheType = 'dashboard') {
    const config = this.cacheConfig[cacheType] || this.cacheConfig.dashboard;
    
    // L1 캐시 (메모리) 저장
    if (config.useMemory) {
      this.setToMemory(key, data, config.ttl);
    }
    
    // L2 캐시 (Redis) 저장
    if (config.useRedis) {
      await this.setToRedis(key, data, config.ttl);
    }
  }

  // [advice from AI] 캐시 삭제
  async delete(key) {
    // 메모리 캐시에서 삭제
    this.memoryCache.delete(key);
    
    // Redis에서 삭제
    if (this.isRedisConnected) {
      try {
        await this.redisClient.del(key);
      } catch (error) {
        console.warn('Redis 삭제 오류:', error.message);
      }
    }
  }

  // [advice from AI] 패턴 기반 캐시 삭제
  async deletePattern(pattern) {
    // 메모리 캐시에서 패턴 매칭 삭제
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Redis에서 패턴 매칭 삭제
    if (this.isRedisConnected) {
      try {
        const keys = await this.redisClient.keys(`*${pattern}*`);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      } catch (error) {
        console.warn('Redis 패턴 삭제 오류:', error.message);
      }
    }
  }

  // [advice from AI] 캐시 통계 조회
  getStats() {
    const totalRequests = this.stats.l1_hits + this.stats.l2_hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? ((this.stats.l1_hits + this.stats.l2_hits) / totalRequests * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      total_requests: totalRequests,
      hit_rate: `${hitRate}%`,
      memory_cache_size: this.memoryCache.size,
      redis_connected: this.isRedisConnected,
      memory_usage: process.memoryUsage()
    };
  }
}

// [advice from AI] 글로벌 캐시 매니저 인스턴스
const cacheManager = new OptimizedCacheManager();

// [advice from AI] 캐시 미들웨어 생성 함수
const createCacheMiddleware = ({ type = 'dashboard', ttl = 300, skipCondition = null }) => {
  return async (req, res, next) => {
    // GET 요청만 캐싱
    if (req.method !== 'GET') {
      return next();
    }

    // 조건부 스킵
    if (skipCondition && skipCondition(req)) {
      return next();
    }

    const key = cacheManager.generateCacheKey(req);
    
    try {
      // 캐시에서 조회
      const cachedData = await cacheManager.get(key, type);
      if (cachedData !== null) {
        systemLogger.info(`Cache Hit (${type}) for ${req.originalUrl}`);
        return res.json(cachedData);
      }

      systemLogger.info(`Cache Miss (${type}) for ${req.originalUrl}`);
      
      // 응답 인터셉트
      const originalJson = res.json;
      res.json = function(body) {
        // 성공적인 응답만 캐싱
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheManager.set(key, body, type).catch(err => 
            systemLogger.error(`Cache Set Error for ${key}:`, err)
          );
        }
        originalJson.call(this, body);
      };
      
      next();
    } catch (err) {
      systemLogger.error(`Cache Middleware Error for ${key}:`, err);
      next();
    }
  };
};

// [advice from AI] 캐시 무효화 미들웨어
const createCacheInvalidationMiddleware = (patterns = []) => {
  return async (req, res, next) => {
    // 수정/삭제 요청 후 관련 캐시 무효화
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const originalSend = res.send;
      res.send = function(data) {
        // 성공적인 응답 후 캐시 무효화
        if (res.statusCode >= 200 && res.statusCode < 300) {
          patterns.forEach(pattern => {
            cacheManager.deletePattern(pattern).catch(err =>
              systemLogger.error(`Cache Invalidation Error for ${pattern}:`, err)
            );
          });
        }
        originalSend.call(this, data);
      };
    }
    next();
  };
};

module.exports = { 
  createCacheMiddleware, 
  createCacheInvalidationMiddleware,
  cacheManager,
  // 기존 코드 호환성
  redisClient: cacheManager.redisClient,
  getCacheStats: () => cacheManager.getStats(),
  clearCache: (pattern) => cacheManager.deletePattern(pattern)
};
