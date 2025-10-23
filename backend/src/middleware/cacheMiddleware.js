// [advice from AI] 프로덕션 레벨 API 응답 캐싱 미들웨어
// Redis 기반 고성능 캐싱 시스템

const redis = require('redis');
const crypto = require('crypto');
const systemLogger = require('./systemLogger');

class ApiCacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.defaultTTL = 300; // 5분 기본 TTL
    this.maxTTL = 3600; // 1시간 최대 TTL
    
    // [advice from AI] 캐시 정책 설정
    this.cacheConfig = {
      // 자주 조회되지만 변경이 적은 데이터
      'static': { ttl: 3600, compress: true },      // 1시간
      'reference': { ttl: 1800, compress: true },   // 30분
      'dashboard': { ttl: 300, compress: false },   // 5분
      'realtime': { ttl: 60, compress: false },     // 1분
      'statistics': { ttl: 600, compress: true },   // 10분
      'user_data': { ttl: 900, compress: false },   // 15분
      'search': { ttl: 180, compress: true },       // 3분
    };
    
    this.init();
  }

  async init() {
    try {
      // [advice from AI] Redis 클라이언트 설정
      this.client = redis.createClient({
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_CACHE_DB || '1'), // 캐시 전용 DB
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.warn('⚠️ Redis 서버 연결 실패');
            return new Error('Redis 서버가 거부되었습니다');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('재시도 시간 초과');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.client.on('connect', () => {
        console.log('✅ Redis 캐시 서버 연결됨');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('❌ Redis 캐시 오류:', err);
        this.isConnected = false;
      });

      this.client.on('end', () => {
        console.log('🔌 Redis 캐시 연결 종료됨');
        this.isConnected = false;
      });

      await this.client.connect();
      
    } catch (error) {
      console.error('❌ Redis 캐시 초기화 실패:', error);
      this.isConnected = false;
    }
  }

  // [advice from AI] 캐시 키 생성
  generateCacheKey(req, customKey = null) {
    if (customKey) return `api:${customKey}`;
    
    const baseKey = `${req.method}:${req.route?.path || req.path}`;
    const queryString = JSON.stringify(req.query);
    const userContext = req.user ? `user:${req.user.id}` : 'anonymous';
    
    // [advice from AI] 사용자별 캐시 분리가 필요한 경우
    const needsUserContext = req.path.includes('/user') || 
                            req.path.includes('/profile') ||
                            req.path.includes('/dashboard');
    
    const keyComponents = [baseKey];
    if (queryString !== '{}') keyComponents.push(queryString);
    if (needsUserContext) keyComponents.push(userContext);
    
    const fullKey = keyComponents.join('|');
    const hashedKey = crypto.createHash('sha256').update(fullKey).digest('hex').substring(0, 16);
    
    return `api:${hashedKey}`;
  }

  // [advice from AI] 데이터 압축
  compressData(data) {
    try {
      const zlib = require('zlib');
      return zlib.gzipSync(JSON.stringify(data)).toString('base64');
    } catch (error) {
      console.warn('⚠️ 데이터 압축 실패:', error);
      return JSON.stringify(data);
    }
  }

  // [advice from AI] 데이터 압축 해제
  decompressData(compressedData, isCompressed = false) {
    try {
      if (!isCompressed) {
        return JSON.parse(compressedData);
      }
      
      const zlib = require('zlib');
      const buffer = Buffer.from(compressedData, 'base64');
      const decompressed = zlib.gunzipSync(buffer).toString();
      return JSON.parse(decompressed);
    } catch (error) {
      console.warn('⚠️ 데이터 압축 해제 실패:', error);
      return null;
    }
  }

  // [advice from AI] 캐시에서 데이터 조회
  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      const cachedData = await this.client.get(key);
      if (!cachedData) return null;
      
      const parsed = JSON.parse(cachedData);
      const data = this.decompressData(parsed.data, parsed.compressed);
      
      // [advice from AI] 캐시 히트 통계 업데이트
      await this.updateCacheStats(key, 'hit');
      
      return {
        data,
        metadata: {
          cached: true,
          cachedAt: parsed.cachedAt,
          ttl: parsed.ttl,
          compressed: parsed.compressed
        }
      };
      
    } catch (error) {
      console.warn('⚠️ 캐시 조회 실패:', error);
      return null;
    }
  }

  // [advice from AI] 캐시에 데이터 저장
  async set(key, data, options = {}) {
    if (!this.isConnected) return false;
    
    try {
      const cacheType = options.type || 'dashboard';
      const config = this.cacheConfig[cacheType] || this.cacheConfig.dashboard;
      
      const ttl = options.ttl || config.ttl;
      const shouldCompress = options.compress !== undefined ? options.compress : config.compress;
      
      const cacheEntry = {
        data: shouldCompress ? this.compressData(data) : JSON.stringify(data),
        compressed: shouldCompress,
        cachedAt: new Date().toISOString(),
        ttl: ttl,
        type: cacheType
      };
      
      await this.client.setEx(key, ttl, JSON.stringify(cacheEntry));
      
      // [advice from AI] 캐시 미스 통계 업데이트
      await this.updateCacheStats(key, 'miss');
      
      return true;
      
    } catch (error) {
      console.warn('⚠️ 캐시 저장 실패:', error);
      return false;
    }
  }

  // [advice from AI] 캐시 무효화
  async invalidate(pattern) {
    if (!this.isConnected) return false;
    
    try {
      const keys = await this.client.keys(`api:*${pattern}*`);
      if (keys.length > 0) {
        await this.client.del(keys);
        console.log(`🗑️ 캐시 무효화: ${keys.length}개 키 삭제`);
      }
      return true;
      
    } catch (error) {
      console.warn('⚠️ 캐시 무효화 실패:', error);
      return false;
    }
  }

  // [advice from AI] 캐시 통계 업데이트
  async updateCacheStats(key, type) {
    try {
      const statsKey = `cache:stats:${new Date().toISOString().split('T')[0]}`;
      await this.client.hIncrBy(statsKey, `${type}_count`, 1);
      await this.client.expire(statsKey, 7 * 24 * 3600); // 7일 보관
    } catch (error) {
      // 통계 업데이트 실패는 무시
    }
  }

  // [advice from AI] 캐시 통계 조회
  async getCacheStats() {
    if (!this.isConnected) return null;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const statsKey = `cache:stats:${today}`;
      const stats = await this.client.hGetAll(statsKey);
      
      const hitCount = parseInt(stats.hit_count || 0);
      const missCount = parseInt(stats.miss_count || 0);
      const totalRequests = hitCount + missCount;
      const hitRate = totalRequests > 0 ? (hitCount / totalRequests * 100).toFixed(2) : 0;
      
      return {
        hitCount,
        missCount,
        totalRequests,
        hitRate: parseFloat(hitRate),
        date: today
      };
      
    } catch (error) {
      console.warn('⚠️ 캐시 통계 조회 실패:', error);
      return null;
    }
  }
}

// [advice from AI] 싱글톤 인스턴스
const cacheManager = new ApiCacheManager();

// [advice from AI] 캐시 미들웨어 팩토리
const createCacheMiddleware = (options = {}) => {
  return async (req, res, next) => {
    // [advice from AI] 캐시 제외 조건
    const skipCache = req.method !== 'GET' || 
                     req.path.includes('/auth/') ||
                     req.path.includes('/upload') ||
                     req.headers['cache-control'] === 'no-cache' ||
                     options.skip;

    if (skipCache) {
      return next();
    }

    try {
      const cacheKey = cacheManager.generateCacheKey(req, options.key);
      const cachedResult = await cacheManager.get(cacheKey);
      
      if (cachedResult) {
        // [advice from AI] 캐시 히트 - 응답 헤더 추가
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cached-At': cachedResult.metadata.cachedAt,
          'X-Cache-TTL': cachedResult.metadata.ttl.toString()
        });
        
        return res.json(cachedResult.data);
      }
      
      // [advice from AI] 캐시 미스 - 원본 응답을 캐시
      const originalJson = res.json;
      res.json = function(data) {
        // [advice from AI] 성공 응답만 캐시
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // 비동기로 캐시 저장 (응답 속도에 영향 없음)
          setImmediate(() => {
            cacheManager.set(cacheKey, data, options);
          });
        }
        
        // [advice from AI] 캐시 미스 응답 헤더 추가
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey
        });
        
        return originalJson.call(this, data);
      };
      
      next();
      
    } catch (error) {
      console.warn('⚠️ 캐시 미들웨어 오류:', error);
      next();
    }
  };
};

// [advice from AI] 캐시 관리 라우트
const cacheRoutes = (router) => {
  // 캐시 통계 조회
  router.get('/cache/stats', async (req, res) => {
    try {
      const stats = await cacheManager.getCacheStats();
      res.json({
        success: true,
        data: stats || { message: 'Redis 연결 없음' }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // 캐시 무효화
  router.delete('/cache/:pattern', async (req, res) => {
    try {
      const { pattern } = req.params;
      const result = await cacheManager.invalidate(pattern);
      res.json({
        success: result,
        message: result ? '캐시가 무효화되었습니다' : '캐시 무효화 실패'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};

module.exports = {
  cacheManager,
  createCacheMiddleware,
  cacheRoutes
};
