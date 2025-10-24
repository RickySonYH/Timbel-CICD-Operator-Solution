// [advice from AI] 감사 로그 미들웨어
// 모든 API 요청을 자동으로 로깅

const { getAuditLogService } = require('../services/auditLogService');

const auditLogService = getAuditLogService();

/**
 * 감사 로그 미들웨어
 */
function auditLogMiddleware(options = {}) {
  const {
    excludePaths = ['/health', '/api-docs', '/favicon.ico'],
    logBody = false,
    logResponse = false
  } = options;
  
  return async (req, res, next) => {
    // 제외 경로 확인
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }
    
    // 요청 시작 시간
    const startTime = Date.now();
    
    // 사용자 정보 추출 (JWT 또는 세션에서)
    const user = req.user || req.session?.user || {};
    
    // 원본 res.json 메서드 저장
    const originalJson = res.json.bind(res);
    
    // res.json 오버라이드하여 응답 캡처
    res.json = function(body) {
      // 응답 데이터 저장
      res.locals.responseBody = body;
      return originalJson(body);
    };
    
    // 응답 완료 시 로그 기록
    res.on('finish', async () => {
      try {
        const duration = Date.now() - startTime;
        const responseBody = res.locals.responseBody;
        
        // 로그 데이터 구성
        const logData = {
          user_id: user.id || user.user_id || null,
          username: user.username || user.name || null,
          user_email: user.email || null,
          user_role: user.role || null,
          
          action: `${req.method} ${req.path}`,
          action_type: getActionType(req.method),
          resource_type: getResourceType(req.path),
          resource_id: getResourceId(req),
          
          description: `${req.method} ${req.originalUrl}`,
          
          ip_address: getClientIp(req),
          user_agent: req.headers['user-agent'],
          request_method: req.method,
          request_url: req.originalUrl,
          request_body: logBody ? sanitizeRequestBody(req.body) : null,
          
          status_code: res.statusCode,
          success: res.statusCode < 400,
          error_message: responseBody?.error || responseBody?.message || null,
          
          severity: getSeverity(req.method, res.statusCode),
          category: getCategory(req.path),
          
          metadata: {
            duration_ms: duration,
            query_params: req.query,
            response_success: responseBody?.success
          }
        };
        
        // 비동기로 로그 기록 (블로킹 방지)
        setImmediate(() => {
          auditLogService.log(logData).catch(err => {
            console.error('감사 로그 기록 오류:', err);
          });
        });
        
      } catch (error) {
        console.error('감사 로그 미들웨어 오류:', error);
      }
    });
    
    next();
  };
}

/**
 * 액션 타입 추출
 */
function getActionType(method) {
  const typeMap = {
    'POST': 'create',
    'GET': 'read',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete'
  };
  
  return typeMap[method] || 'access';
}

/**
 * 리소스 타입 추출
 */
function getResourceType(path) {
  const segments = path.split('/').filter(s => s);
  
  if (segments.length >= 2 && segments[0] === 'api') {
    return segments[1];
  }
  
  return segments[0] || 'unknown';
}

/**
 * 리소스 ID 추출
 */
function getResourceId(req) {
  // URL 파라미터에서 ID 찾기
  const idParams = ['id', 'userId', 'pipelineId', 'clusterId', 'executionId'];
  
  for (const param of idParams) {
    if (req.params[param]) {
      return req.params[param];
    }
  }
  
  return null;
}

/**
 * 클라이언트 IP 추출
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         null;
}

/**
 * 요청 본문 정제 (민감 정보 제거)
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return null;
  }
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  }
  
  return sanitized;
}

/**
 * 심각도 결정
 */
function getSeverity(method, statusCode) {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warning';
  if (method === 'DELETE') return 'warning';
  return 'info';
}

/**
 * 카테고리 결정
 */
function getCategory(path) {
  if (path.includes('/auth') || path.includes('/login')) {
    return 'authentication';
  }
  if (path.includes('/admin') || path.includes('/permission')) {
    return 'authorization';
  }
  if (path.includes('/pipeline') || path.includes('/deploy')) {
    return 'system';
  }
  if (path.includes('/user')) {
    return 'data_access';
  }
  
  return 'system';
}

module.exports = {
  auditLogMiddleware
};

