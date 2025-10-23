// [advice from AI] 간소화된 캐시 미들웨어 (Redis 연결 실패 시 메모리 캐시로 폴백)
const systemLogger = require('./systemLogger');

// [advice from AI] 간단한 메모리 캐시 (Redis 대신)
const memoryCache = new Map();
const cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0
};

// [advice from AI] 캐시 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (now > value.expiry) {
      memoryCache.delete(key);
    }
  }
  
  // 메모리 캐시 크기 제한 (최대 1000개 항목)
  if (memoryCache.size > 1000) {
    const entries = Array.from(memoryCache.entries());
    entries.sort((a, b) => a[1].created - b[1].created);
    
    // 가장 오래된 100개 항목 삭제
    for (let i = 0; i < 100 && i < entries.length; i++) {
      memoryCache.delete(entries[i][0]);
    }
  }
}, 60000); // 1분마다 정리

const createCacheMiddleware = ({ type, ttl = 300 }) => {
  return async (req, res, next) => {
    // GET 요청만 캐싱
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${type}:${req.originalUrl}:${req.user?.id || 'anonymous'}`;
    
    try {
      // 메모리 캐시에서 확인
      const cached = memoryCache.get(key);
      const now = Date.now();
      
      if (cached && now < cached.expiry) {
        cacheStats.hits++;
        systemLogger.info(`Cache Hit for ${key}`);
        return res.json(cached.data);
      }

      cacheStats.misses++;
      systemLogger.info(`Cache Miss for ${key}`);
      
      // 응답 인터셉트
      const originalJson = res.json;
      res.json = (body) => {
        // 성공적인 응답만 캐싱
        if (res.statusCode >= 200 && res.statusCode < 300) {
          memoryCache.set(key, {
            data: body,
            created: now,
            expiry: now + (ttl * 1000)
          });
        }
        originalJson.call(res, body);
      };
      
      next();
    } catch (err) {
      cacheStats.errors++;
      systemLogger.error(`Cache Middleware Error for ${key}:`, err);
      next();
    }
  };
};

// [advice from AI] 캐시 통계 조회
const getCacheStats = () => {
  return {
    ...cacheStats,
    size: memoryCache.size,
    memory_usage: process.memoryUsage()
  };
};

// [advice from AI] 캐시 클리어
const clearCache = (pattern) => {
  if (pattern) {
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key);
      }
    }
  } else {
    memoryCache.clear();
  }
};

module.exports = { 
  createCacheMiddleware, 
  getCacheStats, 
  clearCache,
  // Redis 클라이언트 대신 더미 객체 (기존 코드 호환성)
  redisClient: {
    get: () => Promise.resolve(null),
    setEx: () => Promise.resolve(),
    del: () => Promise.resolve(),
    isReady: false
  }
};
