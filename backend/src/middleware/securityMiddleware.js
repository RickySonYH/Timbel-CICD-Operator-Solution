// [advice from AI] 프로덕션 레벨 보안 미들웨어
// 비율 제한, CORS, CSRF, 보안 헤더, 입력 검증

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const csrf = require('csurf');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const systemLogger = require('./systemLogger');

class SecurityMiddleware {
  constructor() {
    this.config = {
      // CORS 설정
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://rdc.rickyson.com:3000',
        'https://timbel.net'
      ],
      
      // 비율 제한 설정
      rateLimits: {
        general: { windowMs: 15 * 60 * 1000, max: 100 }, // 15분에 100회
        auth: { windowMs: 15 * 60 * 1000, max: 10 },      // 15분에 10회
        sensitive: { windowMs: 60 * 60 * 1000, max: 5 },  // 1시간에 5회
        api: { windowMs: 15 * 60 * 1000, max: 1000 }      // 15분에 1000회
      },
      
      // 보안 헤더 설정
      helmetConfig: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"]
          }
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true
        }
      }
    };
  }

  // [advice from AI] CORS 설정
  getCorsMiddleware() {
    return cors({
      origin: (origin, callback) => {
        // 개발 환경에서는 origin이 없을 수 있음 (예: Postman)
        if (!origin && process.env.NODE_ENV === 'development') {
          return callback(null, true);
        }
        
        if (this.config.corsOrigins.includes(origin)) {
          callback(null, true);
        } else {
          systemLogger.warn('CORS 차단', { origin, allowedOrigins: this.config.corsOrigins });
          callback(new Error('CORS 정책에 의해 차단되었습니다.'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-CSRF-Token',
        'X-Device-ID'
      ],
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining']
    });
  }

  // [advice from AI] 일반적인 비율 제한
  getGeneralRateLimit() {
    return rateLimit({
      windowMs: this.config.rateLimits.general.windowMs,
      max: this.config.rateLimits.general.max,
      message: {
        success: false,
        error: 'TooManyRequests',
        message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        retryAfter: Math.ceil(this.config.rateLimits.general.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        systemLogger.warn('비율 제한 초과', {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          path: req.path,
          method: req.method
        });
        res.status(429).json({
          success: false,
          error: 'TooManyRequests',
          message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
        });
      }
    });
  }

  // [advice from AI] 인증 관련 비율 제한
  getAuthRateLimit() {
    return rateLimit({
      windowMs: this.config.rateLimits.auth.windowMs,
      max: this.config.rateLimits.auth.max,
      message: {
        success: false,
        error: 'TooManyRequests',
        message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.'
      },
      keyGenerator: (req) => {
        // IP와 사용자명을 조합하여 키 생성
        const identifier = req.body?.loginId || req.body?.email || 'unknown';
        return `auth_${req.ip}_${identifier}`;
      },
      handler: (req, res) => {
        systemLogger.warn('인증 비율 제한 초과', {
          ip: req.ip,
          identifier: req.body?.loginId || req.body?.email,
          userAgent: req.headers['user-agent']
        });
        res.status(429).json({
          success: false,
          error: 'TooManyRequests',
          message: '로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요.'
        });
      }
    });
  }

  // [advice from AI] 민감한 작업에 대한 비율 제한
  getSensitiveRateLimit() {
    return rateLimit({
      windowMs: this.config.rateLimits.sensitive.windowMs,
      max: this.config.rateLimits.sensitive.max,
      message: {
        success: false,
        error: 'TooManyRequests',
        message: '민감한 작업 요청이 너무 많습니다. 1시간 후 다시 시도해주세요.'
      },
      keyGenerator: (req) => `sensitive_${req.user?.id || req.ip}`,
      handler: (req, res) => {
        systemLogger.warn('민감한 작업 비율 제한 초과', {
          userId: req.user?.id,
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        res.status(429).json({
          success: false,
          error: 'TooManyRequests',
          message: '민감한 작업 요청이 너무 많습니다. 1시간 후 다시 시도해주세요.'
        });
      }
    });
  }

  // [advice from AI] API 전용 비율 제한
  getAPIRateLimit() {
    return rateLimit({
      windowMs: this.config.rateLimits.api.windowMs,
      max: this.config.rateLimits.api.max,
      message: {
        success: false,
        error: 'TooManyRequests',
        message: 'API 요청 한도를 초과했습니다.'
      },
      keyGenerator: (req) => `api_${req.user?.id || req.ip}`,
      handler: (req, res) => {
        systemLogger.warn('API 비율 제한 초과', {
          userId: req.user?.id,
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        res.status(429).json({
          success: false,
          error: 'TooManyRequests',
          message: 'API 요청 한도를 초과했습니다.'
        });
      }
    });
  }

  // [advice from AI] 보안 헤더 설정
  getHelmetMiddleware() {
    return helmet(this.config.helmetConfig);
  }

  // [advice from AI] CSRF 보호
  getCSRFProtection() {
    return csrf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 // 1시간
      },
      ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
      value: (req) => {
        // 헤더에서 CSRF 토큰 확인
        return req.headers['x-csrf-token'] || 
               req.body._csrf || 
               req.query._csrf;
      }
    });
  }

  // [advice from AI] CSRF 토큰 제공 엔드포인트
  getCSRFTokenEndpoint() {
    return (req, res) => {
      res.json({
        success: true,
        csrfToken: req.csrfToken(),
        timestamp: new Date().toISOString()
      });
    };
  }

  // [advice from AI] 입력 검증 및 정화
  getInputSanitization() {
    return [
      // MongoDB injection 방지
      mongoSanitize({
        replaceWith: '_'
      }),
      
      // XSS 방지
      xss(),
      
      // HTTP Parameter Pollution 방지
      hpp({
        whitelist: ['sort', 'fields', 'page', 'limit', 'filter']
      })
    ];
  }

  // [advice from AI] 압축 미들웨어
  getCompressionMiddleware() {
    return compression({
      level: 6,
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    });
  }

  // [advice from AI] 보안 이벤트 로깅
  getSecurityLogger() {
    return (req, res, next) => {
      // 민감한 경로 접근 로깅
      const sensitivePaths = [
        '/api/auth',
        '/api/admin',
        '/api/mfa',
        '/api/pipeline-orchestrator/execute'
      ];

      const isSensitive = sensitivePaths.some(path => req.path.startsWith(path));
      
      if (isSensitive) {
        systemLogger.info('민감한 경로 접근', {
          method: req.method,
          path: req.path,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          userId: req.user?.id,
          timestamp: new Date().toISOString()
        });
      }

      next();
    };
  }

  // [advice from AI] IP 화이트리스트 확인
  getIPWhitelist(whitelist = []) {
    return (req, res, next) => {
      if (whitelist.length === 0) {
        return next();
      }

      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (!whitelist.includes(clientIP)) {
        systemLogger.warn('IP 화이트리스트 차단', {
          clientIP,
          whitelist,
          path: req.path,
          method: req.method
        });
        
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: '접근이 허용되지 않은 IP 주소입니다.'
        });
      }

      next();
    };
  }

  // [advice from AI] 사용자 에이전트 검증
  getUserAgentValidation() {
    const suspiciousPatterns = [
      /sqlmap/i,
      /nikto/i,
      /nmap/i,
      /masscan/i,
      /zap/i,
      /burp/i
    ];

    return (req, res, next) => {
      const userAgent = req.headers['user-agent'] || '';
      
      const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
      
      if (isSuspicious) {
        systemLogger.warn('의심스러운 User-Agent 감지', {
          userAgent,
          ip: req.ip,
          path: req.path,
          method: req.method
        });
        
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: '허용되지 않은 클라이언트입니다.'
        });
      }

      next();
    };
  }

  // [advice from AI] API 키 검증 (선택적)
  getAPIKeyValidation() {
    return (req, res, next) => {
      // API 키가 필요한 경로인지 확인
      const apiKeyRequired = req.path.startsWith('/api/webhook') || 
                           req.path.startsWith('/api/external');
      
      if (!apiKeyRequired) {
        return next();
      }

      const apiKey = req.headers['x-api-key'];
      const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

      if (!apiKey || !validApiKeys.includes(apiKey)) {
        systemLogger.warn('유효하지 않은 API 키', {
          providedKey: apiKey ? 'PROVIDED' : 'MISSING',
          ip: req.ip,
          path: req.path
        });
        
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: '유효한 API 키가 필요합니다.'
        });
      }

      next();
    };
  }

  // [advice from AI] 요청 크기 제한
  getRequestSizeLimit() {
    return (req, res, next) => {
      const maxSize = process.env.MAX_REQUEST_SIZE || '10mb';
      const contentLength = req.headers['content-length'];
      
      if (contentLength && parseInt(contentLength) > this.parseSize(maxSize)) {
        systemLogger.warn('요청 크기 초과', {
          contentLength,
          maxSize,
          ip: req.ip,
          path: req.path
        });
        
        return res.status(413).json({
          success: false,
          error: 'PayloadTooLarge',
          message: '요청 크기가 너무 큽니다.'
        });
      }

      next();
    };
  }

  // [advice from AI] 모든 보안 미들웨어를 하나로 결합
  getAllSecurityMiddleware() {
    return [
      this.getHelmetMiddleware(),
      this.getCorsMiddleware(),
      this.getCompressionMiddleware(),
      this.getGeneralRateLimit(),
      this.getUserAgentValidation(),
      this.getRequestSizeLimit(),
      this.getSecurityLogger(),
      ...this.getInputSanitization()
    ];
  }

  // [advice from AI] 유틸리티 메서드
  parseSize(size) {
    const units = {
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };
    
    const match = size.toLowerCase().match(/^(\d+)(kb|mb|gb)$/);
    if (match) {
      return parseInt(match[1]) * units[match[2]];
    }
    
    return parseInt(size) || 1024 * 1024; // 기본 1MB
  }

  // [advice from AI] 보안 설정 정보 반환 (관리자용)
  getSecurityConfig() {
    return {
      corsOrigins: this.config.corsOrigins,
      rateLimits: {
        general: `${this.config.rateLimits.general.max} requests per ${this.config.rateLimits.general.windowMs / 60000} minutes`,
        auth: `${this.config.rateLimits.auth.max} requests per ${this.config.rateLimits.auth.windowMs / 60000} minutes`,
        sensitive: `${this.config.rateLimits.sensitive.max} requests per ${this.config.rateLimits.sensitive.windowMs / 60000} minutes`,
        api: `${this.config.rateLimits.api.max} requests per ${this.config.rateLimits.api.windowMs / 60000} minutes`
      },
      securityFeatures: [
        'CORS Protection',
        'Rate Limiting',
        'CSRF Protection',
        'XSS Prevention',
        'SQL Injection Prevention',
        'Security Headers',
        'Input Sanitization',
        'Compression',
        'Request Size Limiting'
      ]
    };
  }
}

// [advice from AI] 싱글톤 인스턴스 생성
const securityMiddleware = new SecurityMiddleware();

module.exports = securityMiddleware;
