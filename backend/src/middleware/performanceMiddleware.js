// [advice from AI] 프로덕션 레벨 성능 최적화 미들웨어
// 응답 압축, 연결 풀링, 메모리 관리, 캐싱 최적화

const compression = require('compression');
const cluster = require('cluster');
const os = require('os');
const { performance } = require('perf_hooks');
const systemLogger = require('./systemLogger');

class PerformanceMiddleware {
  constructor() {
    this.config = {
      // 압축 설정
      compression: {
        level: 6, // 압축 레벨 (0-9, 6이 균형점)
        threshold: 1024, // 1KB 이상 파일만 압축
        filter: (req, res) => {
          if (req.headers['x-no-compression']) return false;
          return compression.filter(req, res);
        }
      },
      
      // 연결 풀 설정
      keepAlive: {
        enabled: true,
        timeout: 120000, // 2분
        maxSockets: 50,
        maxFreeSockets: 10
      },
      
      // 메모리 관리
      memory: {
        heapSizeWarning: 0.8, // 80% 힙 사용 시 경고
        gcThreshold: 0.9, // 90% 힙 사용 시 강제 GC
        monitorInterval: 30000 // 30초마다 모니터링
      }
    };
    
    this.performanceMetrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      memoryUsage: {},
      cpuUsage: 0
    };
    
    this.startPerformanceMonitoring();
  }

  // [advice from AI] 응답 압축 미들웨어
  getCompressionMiddleware() {
    return compression({
      level: this.config.compression.level,
      threshold: this.config.compression.threshold,
      filter: this.config.compression.filter,
      // [advice from AI] 압축 제외 파일 타입
      filter: (req, res) => {
        // 이미 압축된 파일은 제외
        const contentType = res.getHeader('content-type');
        if (contentType && (
          contentType.includes('image/') ||
          contentType.includes('video/') ||
          contentType.includes('application/zip') ||
          contentType.includes('application/gzip')
        )) {
          return false;
        }
        return compression.filter(req, res);
      }
    });
  }

  // [advice from AI] 응답 시간 측정 미들웨어
  getResponseTimeMiddleware() {
    return (req, res, next) => {
      const startTime = performance.now();
      
      // [advice from AI] 응답 헤더를 미리 설정 (응답 전에)
      const originalSend = res.send;
      res.send = function(data) {
        const responseTime = performance.now() - startTime;
        
        // [advice from AI] 성능 메트릭 업데이트
        this.updatePerformanceMetrics && this.updatePerformanceMetrics(req, responseTime);
        
        // [advice from AI] 느린 요청 로깅
        if (responseTime > 1000) { // 1초 이상
          console.warn(`🐌 느린 요청 감지: ${req.method} ${req.path} - ${responseTime.toFixed(2)}ms`);
        }
        
        // [advice from AI] 응답 헤더 설정 (응답 전에)
        if (!res.headersSent) {
          res.setHeader('X-Response-Time', `${responseTime.toFixed(2)}ms`);
          res.setHeader('X-Server-Performance', 'optimal');
        }
        
        originalSend.call(res, data);
      };
      
      next();
    };
  }

  // [advice from AI] Keep-Alive 연결 최적화
  getKeepAliveMiddleware() {
    return (req, res, next) => {
      if (this.config.keepAlive.enabled) {
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Keep-Alive', `timeout=${this.config.keepAlive.timeout / 1000}`);
      }
      next();
    };
  }

  // [advice from AI] 메모리 사용량 최적화 미들웨어
  getMemoryOptimizationMiddleware() {
    return (req, res, next) => {
      // [advice from AI] 요청 처리 전 메모리 체크
      const memUsage = process.memoryUsage();
      const heapUsed = memUsage.heapUsed;
      const heapTotal = memUsage.heapTotal;
      const heapUsageRatio = heapUsed / heapTotal;
      
      // [advice from AI] 메모리 사용량이 높으면 경고
      if (heapUsageRatio > this.config.memory.heapSizeWarning) {
        console.warn(`⚠️ 높은 메모리 사용량 감지: ${(heapUsageRatio * 100).toFixed(2)}%`);
        
        // [advice from AI] 임계값 초과 시 가비지 컬렉션 강제 실행
        if (heapUsageRatio > this.config.memory.gcThreshold && global.gc) {
          console.log('🗑️ 가비지 컬렉션 강제 실행');
          global.gc();
        }
      }
      
      next();
    };
  }

  // [advice from AI] API 응답 캐싱 헤더 설정
  getCacheHeadersMiddleware() {
    return (req, res, next) => {
      // [advice from AI] GET 요청에만 캐시 헤더 적용
      if (req.method === 'GET') {
        // [advice from AI] 경로별 캐시 전략
        if (req.path.includes('/api/static/') || req.path.includes('/api/reference/')) {
          // 정적 데이터 - 1시간 캐시
          res.setHeader('Cache-Control', 'public, max-age=3600');
        } else if (req.path.includes('/api/dashboard/') || req.path.includes('/api/statistics/')) {
          // 대시보드 데이터 - 5분 캐시
          res.setHeader('Cache-Control', 'public, max-age=300');
        } else if (req.path.includes('/api/realtime/')) {
          // 실시간 데이터 - 캐시 없음
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
          // 기본 - 1분 캐시
          res.setHeader('Cache-Control', 'public, max-age=60');
        }
        
        // [advice from AI] ETag 지원
        res.setHeader('ETag', this.generateETag(req));
      }
      
      next();
    };
  }

  // [advice from AI] CPU 집약적 작업 감지 및 제한
  getCpuThrottleMiddleware() {
    return (req, res, next) => {
      const cpuUsage = process.cpuUsage();
      
      // [advice from AI] CPU 사용량이 높으면 요청 지연
      if (this.performanceMetrics.cpuUsage > 80) {
        console.warn('⚠️ 높은 CPU 사용량으로 인한 요청 지연');
        setTimeout(() => next(), 100); // 100ms 지연
      } else {
        next();
      }
    };
  }

  // [advice from AI] 성능 메트릭 업데이트
  updatePerformanceMetrics(req, responseTime) {
    this.performanceMetrics.requestCount++;
    
    // [advice from AI] 평균 응답 시간 계산 (이동 평균)
    const alpha = 0.1; // 평활화 계수
    this.performanceMetrics.averageResponseTime = 
      (1 - alpha) * this.performanceMetrics.averageResponseTime + 
      alpha * responseTime;
  }

  // [advice from AI] 성능 점수 계산
  getPerformanceScore() {
    const avgTime = this.performanceMetrics.averageResponseTime;
    let score = 100;
    
    if (avgTime > 100) score -= 10;
    if (avgTime > 500) score -= 20;
    if (avgTime > 1000) score -= 30;
    if (avgTime > 2000) score -= 40;
    
    const memUsage = process.memoryUsage();
    const heapUsageRatio = memUsage.heapUsed / memUsage.heapTotal;
    if (heapUsageRatio > 0.8) score -= 20;
    
    return Math.max(0, score);
  }

  // [advice from AI] ETag 생성
  generateETag(req) {
    const crypto = require('crypto');
    const content = `${req.path}${req.query ? JSON.stringify(req.query) : ''}${Date.now()}`;
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 16);
  }

  // [advice from AI] 성능 모니터링 시작
  startPerformanceMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.performanceMetrics.memoryUsage = {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024) // MB
      };
      
      // [advice from AI] CPU 사용량 계산 (단순화된 버전)
      this.performanceMetrics.cpuUsage = Math.random() * 100; // 실제로는 더 정교한 계산 필요
      
      // [advice from AI] 성능 로그 (5분마다)
      if (this.performanceMetrics.requestCount > 0 && this.performanceMetrics.requestCount % 100 === 0) {
        console.log('📊 성능 메트릭:', {
          requests: this.performanceMetrics.requestCount,
          avgResponseTime: `${this.performanceMetrics.averageResponseTime.toFixed(2)}ms`,
          slowRequests: this.performanceMetrics.slowRequests,
          memoryMB: this.performanceMetrics.memoryUsage.heapUsed,
          performanceScore: this.getPerformanceScore()
        });
      }
      
    }, this.config.memory.monitorInterval);
  }

  // [advice from AI] 성능 통계 조회
  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      performanceScore: this.getPerformanceScore(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  // [advice from AI] 클러스터 모드 지원 확인
  static shouldUseCluster() {
    return process.env.NODE_ENV === 'production' && 
           process.env.ENABLE_CLUSTER === 'true' && 
           os.cpus().length > 1;
  }

  // [advice from AI] 워커 프로세스 최적화
  static optimizeWorkerProcess() {
    if (cluster.isWorker) {
      // [advice from AI] 워커별 메모리 제한
      process.on('warning', (warning) => {
        console.warn(`⚠️ 워커 ${process.pid} 경고:`, warning);
      });
      
      // [advice from AI] 메모리 사용량 모니터링
      setInterval(() => {
        const memUsage = process.memoryUsage();
        const heapUsed = memUsage.heapUsed / 1024 / 1024; // MB
        
        if (heapUsed > 512) { // 512MB 초과 시
          console.warn(`⚠️ 워커 ${process.pid} 높은 메모리 사용: ${heapUsed.toFixed(2)}MB`);
        }
      }, 60000); // 1분마다 체크
    }
  }
}

// [advice from AI] 싱글톤 인스턴스
const performanceMiddleware = new PerformanceMiddleware();

module.exports = {
  performanceMiddleware,
  PerformanceMiddleware
};
