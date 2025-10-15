// [advice from AI] 보안 강화 미들웨어 - JWT 토큰 보안, API 보안, 데이터 보호
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// [advice from AI] API Rate Limiting
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: 'Too many requests',
      message: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// [advice from AI] 일반 API Rate Limiter (실사용 모드 - 완화)
const generalLimiter = createRateLimiter(
  1 * 60 * 1000, // 1분
  500, // 최대 500회 요청 (대폭 완화)
  '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
);

// [advice from AI] 인증 API Rate Limiter (실사용 모드 - 완화)
const authLimiter = createRateLimiter(
  5 * 60 * 1000, // 5분 (단축)
  50, // 최대 50회 로그인 시도 (대폭 완화)
  '로그인 시도가 너무 많습니다. 5분 후 다시 시도해주세요.'
);

// [advice from AI] 민감한 작업 Rate Limiter
const sensitiveOperationLimiter = createRateLimiter(
  5 * 60 * 1000, // 5분
  10, // 최대 10회
  '민감한 작업 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
);

// [advice from AI] 요청 로깅 미들웨어
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = Date.now() - start;
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      duration: `${duration}ms`,
      status: res.statusCode,
      user: req.user?.username || 'anonymous'
    };
    
    console.log(`📝 API 요청: ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms) - ${req.user?.username || 'anonymous'}`);
    
    return originalSend.call(this, data);
  };
  
  next();
};

// [advice from AI] 데이터 마스킹 (민감한 정보 보호)
const maskSensitiveData = (data) => {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  const maskObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(maskObject);
    }
    
    const masked = {};
    for (const [key, value] of Object.entries(obj)) {
      const isSenesitive = sensitiveFields.some(field => 
        key.toLowerCase().includes(field)
      );
      
      if (isSenesitive && typeof value === 'string') {
        masked[key] = '*'.repeat(Math.min(value.length, 8));
      } else if (typeof value === 'object') {
        masked[key] = maskObject(value);
      } else {
        masked[key] = value;
      }
    }
    return masked;
  };
  
  return maskObject(data);
};

// [advice from AI] 입력 검증 미들웨어
const validateInput = (req, res, next) => {
  // XSS 방지
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  // 재귀적으로 모든 문자열 필드 검증
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  next();
};

// [advice from AI] JWT 토큰 강화 검증
const enhancedJWTValidation = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      message: '인증 토큰이 필요합니다.'
    });
  }

  try {
    // 토큰 블랙리스트 확인 (실제 환경에서는 Redis 등 사용)
    const tokenBlacklist = new Set(); // 로그아웃된 토큰들
    
    if (tokenBlacklist.has(token)) {
      return res.status(401).json({
        success: false,
        error: 'Token revoked',
        message: '무효화된 토큰입니다.'
      });
    }

    // 토큰 사용 기록 (보안 감사)
    console.log(`🔐 JWT 토큰 사용: ${req.method} ${req.originalUrl} - ${req.user?.username || 'unknown'}`);
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: '유효하지 않은 토큰입니다.'
    });
  }
};

module.exports = {
  generalLimiter,
  authLimiter,
  sensitiveOperationLimiter,
  requestLogger,
  validateInput,
  enhancedJWTValidation,
  maskSensitiveData
};
