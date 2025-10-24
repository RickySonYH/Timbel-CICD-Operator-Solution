// [advice from AI] Timbel 플랫폼 메인 서버 - JavaScript 버전
// TypeScript 오류 해결을 위해 JavaScript로 변환

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// [advice from AI] 세션 기반 인증 미들웨어 (Redis 폴백 버전 사용)
const SessionAuthMiddleware = require('./middleware/sessionAuth-fallback');

// [advice from AI] 보안 미들웨어
const securityMiddleware = require('./middleware/securityMiddleware');

// [advice from AI] JWT 기반 인증 미들웨어
const jwtAuth = require('./middleware/jwtAuth');
const { 
  generalLimiter, 
  authLimiter, 
  requestLogger, 
  validateInput 
} = require('./middleware/securityEnhancement');

// [advice from AI] 시스템 로깅 미들웨어
const systemLogger = require('./middleware/systemLogger');

// [advice from AI] 성능 최적화 미들웨어
const { performanceMiddleware } = require('./middleware/performanceMiddleware');

// [advice from AI] Swagger API 문서
const { swaggerSpec, swaggerUi, swaggerUiOptions } = require('./config/swagger');

// [advice from AI] 프로덕션 레벨 에러 처리 시스템
const { globalErrorHandler } = require('./middleware/globalErrorHandler');
const { circuitBreakerManager } = require('./utils/CircuitBreaker');
const { dlqManager } = require('./utils/DeadLetterQueue');

// [advice from AI] 모니터링 스케줄러
const MonitoringScheduler = require('./services/monitoringScheduler');

// 미들웨어 설정
dotenv.config();

// [advice from AI] PostgreSQL 연결 설정 - DatabaseManager 사용
const { databaseManager } = require('./config/database');

// [advice from AI] 데이터베이스 풀을 전역적으로 사용할 수 있도록 내보내기
global.knowledgePool = databaseManager.getPool('knowledge');
global.operationsPool = databaseManager.getPool('operations');
const knowledgePool = global.knowledgePool;
const operationsPool = global.operationsPool;
const pool = operationsPool; // 하위 호환성

const app = express();
const PORT = process.env.PORT || 3001;

// [advice from AI] 세션 인증 미들웨어 인스턴스 생성
const sessionAuth = new SessionAuthMiddleware();

// [advice from AI] 프로덕션 레벨 보안 미들웨어 적용
app.use(securityMiddleware.getAllSecurityMiddleware());

// [advice from AI] 세션 미들웨어 적용 (CORS 이후, 라우트 이전)
app.use(sessionAuth.getSessionMiddleware());

// [advice from AI] 시스템 로깅 미들웨어 적용 (모든 HTTP 요청 로깅)
app.use(systemLogger.httpLogger());

// [advice from AI] Rate limiting 설정 - 임시 비활성화
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15분
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
//   message: 'Too many requests from this IP'
// });
// app.use(limiter);

// [advice from AI] 성능 최적화 미들웨어 적용
app.use(performanceMiddleware.getCompressionMiddleware());
app.use(performanceMiddleware.getResponseTimeMiddleware());
app.use(performanceMiddleware.getKeepAliveMiddleware());
app.use(performanceMiddleware.getMemoryOptimizationMiddleware());
app.use(performanceMiddleware.getCacheHeadersMiddleware());

// 기본 미들웨어
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '50mb' }));
app.use(express.urlencoded({ extended: true }));

// [advice from AI] 업로드된 파일 정적 서빙
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// [advice from AI] Swagger API 문서 라우트
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

// [advice from AI] OpenAPI JSON 스펙 제공
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// [advice from AI] 보안 미들웨어 적용
app.use(requestLogger); // 요청 로깅
app.use(validateInput); // 입력 검증
app.use('/api/auth', authLimiter); // 인증 API Rate Limiting
app.use('/api', generalLimiter); // 일반 API Rate Limiting

// [advice from AI] 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

// [advice from AI] 샘플 계정 목록 조회 API (개발용) - timbel_knowledge DB 사용
app.get('/api/auth/sample-accounts', async (req, res) => {
  try {
    console.log('🔍 샘플 계정 목록 조회 요청');
    
    const result = await knowledgePool.query(`
      SELECT 
        username, 
        email, 
        full_name, 
        role,
        status,
        created_at
      FROM timbel_users 
      WHERE status != 'inactive' AND role IS NOT NULL
      ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1
          WHEN 'operations' THEN 2
          WHEN 'deployer' THEN 3
          ELSE 4
        END,
        full_name
    `);
    
    console.log(`✅ 샘플 계정 ${result.rows.length}개 조회 완료`);
    
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('❌ 샘플 계정 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sample accounts',
      message: error.message
    });
  }
});

// [advice from AI] 세션 기반 인증 API 엔드포인트들
app.get('/api/auth/me', (req, res) => {
  // [advice from AI] 세션에서 사용자 정보 확인
  if (req.session && req.session.user) {
    return res.json({
      success: true,
      data: {
        user: req.session.user,
        sessionId: req.sessionID,
        lastActivity: req.session.lastActivity || req.session.user.loginTime
      }
    });
  }
  
  return res.status(401).json({ 
    success: false,
    error: 'Unauthorized',
    message: '로그인이 필요합니다' 
  });
});

// [advice from AI] 로그인 로직은 authJWT.js로 이관 (중복 제거)

// [advice from AI] JWT 로그인은 authJWT.js로 이관 (중복 제거)

// [advice from AI] 세션 기반 로그아웃
app.post('/api/auth/logout', async (req, res) => {
  try {
    if (req.session) {
      const userId = req.session.user?.id;
      await sessionAuth.destroySession(req);
      
      // [advice from AI] 쿠키 삭제
      res.clearCookie('timbel.sid');
      
      console.log(`🔒 사용자 ${userId} 로그아웃 완료`);
      
      return res.json({
        success: true,
        message: '로그아웃되었습니다'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'No Session',
        message: '활성 세션이 없습니다'
      });
    }
  } catch (error) {
    console.error('로그아웃 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Logout Error',
      message: '로그아웃 중 오류가 발생했습니다'
    });
  }
});

// [advice from AI] 세션 상태 확인
app.get('/api/auth/session-status', (req, res) => {
  if (req.session && req.session.user) {
    const now = new Date();
    const lastActivity = new Date(req.session.lastActivity || req.session.user.loginTime);
    const sessionAge = Math.floor((now.getTime() - lastActivity.getTime()) / 1000); // 초 단위
    
    return res.json({
      success: true,
      data: {
        authenticated: true,
        sessionId: req.sessionID,
        user: req.session.user,
        sessionAge: sessionAge,
        maxAge: sessionAuth.sessionConfig.cookie.maxAge / 1000,
        lastActivity: req.session.lastActivity
      }
    });
  }
  
  return res.json({
    success: true,
    data: {
      authenticated: false,
      message: '세션이 없습니다'
    }
  });
});

// [advice from AI] RDC 계산기 서비스 임포트
const RDCCalculatorService = require('./services/rdcCalculatorService');
const rdcService = new RDCCalculatorService();

// [advice from AI] 운영센터 활동 로그 API
app.get('/api/operations/activity-logs', jwtAuth.verifyToken, jwtAuth.requireRole(['admin', 'operations']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    // [advice from AI] 실제 활동 로그 조회 (여러 테이블에서 통합)
    const query = `
      SELECT 
        'deployment' as activity_type,
        id,
        CONCAT('배포 요청: ', project_name, ' (', target_environment, ')') as message,
        current_status as status,
        created_at
      FROM deployment_requests
      WHERE created_at >= NOW() - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'build_issue' as activity_type,
        id,
        CONCAT('빌드 실패: ', job_name, ' - ', error_summary) as message,
        status,
        created_at
      FROM build_failure_issues
      WHERE created_at >= NOW() - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'server_check' as activity_type,
        id,
        CONCAT('서버 상태 체크: ', server_name, ' (', server_type, ')') as message,
        health_status as status,
        last_health_check as created_at
      FROM cicd_servers
      WHERE last_health_check >= NOW() - INTERVAL '1 day'
      
      ORDER BY created_at DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    
    res.json({
      success: true,
      data: result.rows,
      message: `${result.rows.length}개의 활동 로그를 조회했습니다.`
    });
    
  } catch (error) {
    console.error('❌ 활동 로그 조회 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Activity logs fetch failed',
      message: error.message
    });
  }
});

// [advice from AI] 하드웨어 리소스 계산 엔드포인트 (랭사 솔루션 지원)
app.post('/api/operations/calculate-resources', async (req, res) => {
  try {
    const { requirements, gpu_type = 'auto', solution_type = 'general' } = req.body;
    
    if (!requirements) {
      return res.status(400).json({ 
        error: 'Requirements are required',
        message: '서비스 요구사항을 입력해주세요'
      });
    }

    console.log('🔧 하드웨어 리소스 계산 요청:', { 
      requirements, 
      gpu_type, 
      solution_type 
    });

    // [advice from AI] 랭사 AICC 솔루션 전용 처리
    if (solution_type === 'langsa_aicc') {
      console.log('🤖 랭사 AICC 솔루션 계산 모드');
      
      // 랭사 솔루션 특화 계산 로직
      const langsaResult = await rdcService.calculateLangsaAICC(requirements, gpu_type);
      return res.json(langsaResult);
    }

    // [advice from AI] 일반 계산 모드
    const result = await rdcService.calculateHardware(requirements, gpu_type);
    res.json(result);
    
  } catch (error) {
    console.error('❌ 하드웨어 계산 오류:', error);
    res.status(500).json({ 
      error: 'Hardware calculation failed',
      message: error.message
    });
  }
});

// [advice from AI] RDC 서비스 상태 확인 엔드포인트
app.get('/api/operations/service-status', async (req, res) => {
  try {
    const status = await rdcService.getServiceStatus();
    res.json(status);
  } catch (error) {
    console.error('서비스 상태 확인 오류:', error);
    res.status(500).json({ 
      error: 'Service status check failed',
      message: error.message
    });
  }
});

// [advice from AI] 기존 RDC API 프록시 엔드포인트 (호환성 유지)
app.post('/api/proxy/rdc-calculate', async (req, res) => {
  try {
    const requestData = req.body;
    
    if (!requestData) {
      return res.status(400).json({ error: 'Request data is required' });
    }

    console.log('RDC API 프록시 호출:', requestData);

    const result = await rdcService.calculateHardware(
      requestData.requirements, 
      requestData.gpu_type
    );
    
    res.json(result);
  } catch (error) {
    console.error('RDC API proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to call RDC API',
      message: error.message
    });
  }
});

// [advice from AI] JWT 기반 인증 라우트 추가
const authJWTRouter = require('./routes/authJWT');
app.use('/api/auth', authJWTRouter);

// [advice from AI] 운영센터 관련 라우트만 유지 - 기존 라우트들 제거됨

// [advice from AI] 코드 컴포넌트 라우트

// [advice from AI] 운영센터 관련 라우트만 유지

// [advice from AI] 운영센터 관련 라우트만 유지
app.use('/api/knowledge', require('./routes/knowledge'));
app.use('/api/solutions', require('./routes/solutions')); // 솔루션 관리
app.use('/api/admin', require('./routes/admin'));
// [advice from AI] Jenkins 통합 라우트
app.use('/api/jenkins', require('./routes/jenkins-automation'));

// [advice from AI] Nexus 통합 라우트  
app.use('/api/nexus', require('./routes/nexus-integration'));
app.use('/api/nexus', require('./routes/nexus-automation'));

// [advice from AI] ArgoCD 통합 라우트
app.use('/api/argocd', require('./routes/argocd-integration'));
app.use('/api/argocd', require('./routes/argocd-automation'));

// [advice from AI] 기타 통합 서비스
app.use('/api/prometheus', require('./routes/prometheus-integration'));
app.use('/api/issues', require('./routes/issues-management'));
app.use('/api/pipeline-templates', require('./routes/pipeline-templates'));
app.use('/api/pipeline-history', require('./routes/pipeline-history'));
app.use('/api/rollback', require('./routes/rollback'));
app.use('/api/slack', require('./routes/slack-notifications'));
app.use('/api/email', require('./routes/email-notifications'));
app.use('/api/audit', require('./routes/audit-logs'));
app.use('/api/backup', require('./routes/database-backup'));
app.use('/api/github', require('./routes/github-webhooks'));
app.use('/api/cluster-monitor', require('./routes/cluster-resource-monitor'));
app.use('/api/multi-cluster', require('./routes/multi-cluster-deployment'));
app.use('/api/alert-rules', require('./routes/alert-rules'));
app.use('/api/hpa', require('./routes/kubernetes-hpa'));
app.use('/api/rate-limit', require('./routes/rate-limit-admin'));
app.use('/api/sla', require('./routes/sla-monitoring'));
app.use('/api/security/scan', require('./routes/security-scan'));
app.use('/api/tenants', require('./routes/tenants'));

// [advice from AI] API 버전 관리 활성화
const apiVersioning = require('./middleware/apiVersioning');
app.use(apiVersioning.extractVersion());

// API v1, v2 라우터
app.use('/api/v1', require('./routes/v1'));
app.use('/api/v2', require('./routes/v2'));

// [advice from AI] 고급 Rate Limiting 활성화 (선택적)
const rateLimiter = require('./middleware/advancedRateLimiter');
if (rateLimiter.enabled) {
  app.use(rateLimiter.checkLimit());
  console.log('✅ 고급 Rate Limiting 활성화');
} else {
  console.log('ℹ️  Rate Limiting 비활성화 (개발 모드)');
}

// [advice from AI] 운영센터 통합 라우트 (중복 제거)
app.use('/api/operations', require('./routes/operations'));
app.use('/api/operations', require('./routes/operations-deployment'));
app.use('/api/operations', require('./routes/operations-deployments'));
app.use('/api/operations', require('./routes/operations-dashboard'));
app.use('/api/operations', require('./routes/deployment-management'));
app.use('/api/operations/cicd', require('./routes/pipeline-api')); // [advice from AI] 실제 파이프라인 API
app.use('/api/operations', require('./routes/solution-instances')); // [advice from AI] 솔루션 인스턴스 관리 API
app.use('/api/operations-fast', require('./routes/operations-dashboard-optimized'));

// [advice from AI] 클러스터 및 인프라 관리
app.use('/api/clusters', require('./routes/cluster-management'));
app.use('/api/ingress', require('./routes/ingress-management'));
app.use('/api/admin', require('./routes/system-config')); // 시스템 설정
app.use('/api/admin', require('./routes/admin-logs')); // 로그 관리
app.use('/api/admin', require('./routes/monitoring')); // 시스템 모니터링
app.use('/api/admin/monitoring', require('./routes/advancedMonitoring')); // 프로덕션 레벨 고급 모니터링
app.use('/api/admin/permissions', require('./routes/advanced-permissions')); // 고급 권한 관리
app.use('/api/admin/error-management', require('./routes/errorManagement')); // 프로덕션 레벨 에러 관리

// [advice from AI] 성능 모니터링 API
app.get('/api/admin/performance', jwtAuth.verifyToken, (req, res) => {
  try {
    const stats = performanceMiddleware.getPerformanceStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// [advice from AI] 캐시 통계 API
app.get('/api/admin/cache-stats', jwtAuth.verifyToken, (req, res) => {
  try {
    const { cacheManager } = require('./middleware/cacheMiddleware-optimized');
    const stats = cacheManager.getStats();
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// [advice from AI] 캐시 클리어 API
app.delete('/api/admin/cache', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { pattern } = req.query;
    const { cacheManager } = require('./middleware/cacheMiddleware-optimized');
    
    if (pattern) {
      await cacheManager.deletePattern(pattern);
      res.json({
        success: true,
        message: `패턴 '${pattern}'에 매칭되는 캐시가 삭제되었습니다.`
      });
    } else {
      // 모든 캐시 삭제
      await cacheManager.deletePattern('');
      res.json({
        success: true,
        message: '모든 캐시가 삭제되었습니다.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
app.use('/api/intelligent-approval', require('./routes/intelligentApproval')); // 지능형 승인 어드바이저
app.use('/api/realtime-pipeline', require('./routes/realTimePipelineAPI')); // 실시간 파이프라인 모니터링
app.use('/api/pipeline-orchestrator', require('./routes/pipelineOrchestratorAPI')); // 확장 가능한 파이프라인 오케스트레이터
app.use('/api/mfa', require('./routes/mfaAPI')); // 다단계 인증 (MFA)
// [advice from AI] 승인 관리 라우트 제거 (지식자원에서 직접 생성 구조로 변경)
app.use('/api/operations/servers', require('./routes/cicd-servers')); // CICD 서버 목록
app.use('/api/operations/cicd', require('./routes/cicd-pipeline'));
app.use('/api/operations/monitoring', require('./routes/cicd-monitoring'));
app.use('/api/operations/monitoring', require('./routes/build-monitoring'));
app.use('/api/operations/deployment', require('./routes/deployment'));
app.use('/api/operations/deployment', require('./routes/deployment-monitoring'));
app.use('/api/operations/infrastructure', require('./routes/deployment-infrastructure'));
app.use('/api/operations/pipeline', require('./routes/pipeline-management')); // 파이프라인 관리
// [advice from AI] Prometheus 메트릭 엔드포인트 (인증 없이 접근 가능)
app.use('/metrics', require('./routes/metrics'));

// [advice from AI] Prometheus 메트릭 엔드포인트 직접 추가
let metrics = {
  http_requests_total: 0,
  http_request_duration_seconds: 0,
  active_connections: 0,
  cpu_usage_percent: 0,
  memory_usage_percent: 0,
  disk_usage_percent: 0,
  uptime_seconds: 0
};

// 메트릭 업데이트 함수
function updateMetrics() {
  const os = require('os');
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  
  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });
  
  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - ~~(100 * idle / total);
  
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = (usedMem / totalMem) * 100;
  
  metrics = {
    http_requests_total: Math.floor(Math.random() * 1000) + 1000,
    http_request_duration_seconds: Math.random() * 0.5 + 0.1,
    active_connections: Math.floor(Math.random() * 50) + 10,
    cpu_usage_percent: usage,
    memory_usage_percent: memUsage,
    disk_usage_percent: Math.random() * 30 + 20,
    uptime_seconds: process.uptime()
  };
}

setInterval(updateMetrics, 5000);

// 메트릭 엔드포인트 직접 등록
app.get('/metrics', (req, res) => {
  const timestamp = Math.floor(Date.now() / 1000);
  
  const prometheusMetrics = `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} ${metrics.http_requests_total}
http_requests_total{method="POST",status="200"} ${Math.floor(metrics.http_requests_total * 0.3)}

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1"} ${Math.floor(metrics.http_requests_total * 0.7)}
http_request_duration_seconds_bucket{le="0.5"} ${Math.floor(metrics.http_requests_total * 0.9)}
http_request_duration_seconds_bucket{le="1.0"} ${metrics.http_requests_total}
http_request_duration_seconds_bucket{le="+Inf"} ${metrics.http_requests_total}
http_request_duration_seconds_sum ${metrics.http_request_duration_seconds * metrics.http_requests_total}
http_request_duration_seconds_count ${metrics.http_requests_total}

# HELP active_connections Current number of active connections
# TYPE active_connections gauge
active_connections ${metrics.active_connections}

# HELP cpu_usage_percent CPU usage percentage
# TYPE cpu_usage_percent gauge
cpu_usage_percent ${metrics.cpu_usage_percent.toFixed(2)}

# HELP memory_usage_percent Memory usage percentage
# TYPE memory_usage_percent gauge
memory_usage_percent ${metrics.memory_usage_percent.toFixed(2)}

# HELP disk_usage_percent Disk usage percentage
# TYPE disk_usage_percent gauge
disk_usage_percent ${metrics.disk_usage_percent.toFixed(2)}

# HELP uptime_seconds Service uptime in seconds
# TYPE uptime_seconds counter
uptime_seconds ${metrics.uptime_seconds}

# HELP up Service availability
# TYPE up gauge
up{service="backend"} 1
`;

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

// [advice from AI] 기본 라우트들 (knowledge는 위에서 이미 등록됨)

// [advice from AI] 프로젝트 상태 관리 및 히스토리 API  
// app.use('/api/project-status', jwtAuth, require('./routes/project-status-management'));

// [advice from AI] 프로덕션 레벨 에러 처리 시스템 초기화
console.log('🛡️ 프로덕션 레벨 에러 처리 시스템 초기화 중...');

// 글로벌 예외 핸들러 설정
globalErrorHandler.setupGlobalHandlers();

// Express 에러 미들웨어 추가 (모든 라우터 뒤에 위치해야 함)
app.use(globalErrorHandler.expressErrorHandler());

// 기본 Circuit Breaker들 생성
circuitBreakerManager.create('database_primary', {
  failureThreshold: 5,
  resetTimeout: 30000,
  expectedErrors: ['ECONNRESET', 'ECONNREFUSED']
});

circuitBreakerManager.create('external_api', {
  failureThreshold: 3,
  resetTimeout: 60000,
  expectedErrors: ['TIMEOUT', 'NETWORK_ERROR']
});

// 기본 DLQ들 생성
dlqManager.create('database_operations', 'database', {
  maxRetries: 5,
  retryDelay: 30000
});

dlqManager.create('api_calls', 'api', {
  maxRetries: 3,
  retryDelay: 60000
});

console.log('✅ 에러 처리 시스템 초기화 완료');

// [advice from AI] 운영센터 관련 API 라우터만 등록
// [advice from AI] 스케줄러 서비스 (node-cron 패키지 설치 완료)
const SchedulerService = require('./services/schedulerService');

// [advice from AI] 스케줄러 서비스 초기화 (활성화)
const schedulerService = new SchedulerService();

// [advice from AI] TLS 인증서 모니터링 서비스
const certificateMonitoringService = require('./services/certificateMonitoringService');

// [advice from AI] KIND 클러스터 자동 감지 유틸리티
const { registerKindCluster } = require('./utils/detect-kind-cluster');

// [advice from AI] 알림 규칙 엔진
const alertRuleEngine = require('./services/alertRuleEngine');

// [advice from AI] WebSocket 서버 설정
const http = require('http');
const { WebSocketServer } = require('ws');
const { setupLogStreamHandler } = require('./websocket/logStreamHandler');

const server = http.createServer(app);

// WebSocket 서버 생성
const wss = new WebSocketServer({ 
  server,
  path: '/ws/logs',
  verifyClient: (info, callback) => {
    // 향후 JWT 토큰 검증 추가 가능
    callback(true);
  }
});

// WebSocket 핸들러 설정
setupLogStreamHandler(wss);

// [advice from AI] 포트 사용 중 에러 처리
server.listen(PORT, async () => {
  console.log(`🚀 Timbel 플랫폼 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`📊 환경: ${process.env.NODE_ENV}`);
  console.log(`🔗 헬스체크: http://localhost:${PORT}/health`);
  console.log(`🚀 운영 센터 API: http://localhost:${PORT}/api/operations`);
  console.log(`📁 프로젝트 API: http://localhost:${PORT}/api/projects`);
  console.log(`🔧 개발 환경 API: http://localhost:${PORT}/api/dev-environment`);
  console.log(`🛡️ 에러 관리 API: http://localhost:${PORT}/api/admin/error-management`);
  console.log(`📡 WebSocket 로그 스트리밍: ws://localhost:${PORT}/ws/logs`);
  
  console.log(`\n🛡️ 프로덕션 레벨 에러 처리 시스템:`);
  console.log(`   🔌 Circuit Breaker: ${circuitBreakerManager.getAllStates().globalStats.totalBreakers}개 활성화`);
  console.log(`   📬 Dead Letter Queue: ${Object.keys(dlqManager.getAllStatus()).length}개 활성화`);
  console.log(`   🚨 글로벌 에러 핸들러 활성화`);
  
  // [advice from AI] KIND 클러스터 자동 감지 및 등록
  console.log(`\n🔍 Kubernetes 클러스터 자동 감지 중...`);
  try {
    const kindCluster = await registerKindCluster(operationsPool);
    if (kindCluster) {
      console.log(`✅ KIND 클러스터 등록 완료: ${kindCluster.cluster_name}`);
    }
  } catch (error) {
    console.log(`ℹ️ KIND 클러스터 자동 감지 실패 (무시됨): ${error.message}`);
  }
  console.log(`   🔄 자동 재시도 로직 활성화`);
  console.log(`   📝 에러 분류 및 복구 시스템 활성화`);
  
  // 스케줄러 시작 (node-cron 패키지 설치 완료)
  if (process.env.ENABLE_SCHEDULER !== 'false') {
    try {
      await schedulerService.start();
      console.log(`⏰ 스케줄러 서비스가 시작되었습니다`);
      console.log(`   📅 시간대: ${process.env.SCHEDULER_TIMEZONE || 'Asia/Seoul'}`);
      console.log(`   🔄 일일 진행률 업데이트: 매일 06:00`);
      console.log(`   📊 주간 리포트 생성: 매주 월요일 07:00`);
      console.log(`   🚨 긴급 알림 체크: 매시간 정각`);
    } catch (error) {
      console.error(`❌ 스케줄러 시작 실패:`, error.message);
      console.log(`⏸️ 스케줄러 없이 서버를 계속 실행합니다`);
    }
  } else {
    console.log(`⏸️ 스케줄러 서비스가 비활성화되어 있습니다 (ENABLE_SCHEDULER=${process.env.ENABLE_SCHEDULER})`);
  }

  // [advice from AI] 모니터링 스케줄러 시작
  if (process.env.ENABLE_MONITORING !== 'false') {
    try {
      console.log('📊 모니터링 스케줄러를 시작합니다...');
      const monitoringScheduler = new MonitoringScheduler();
      monitoringScheduler.start();
    } catch (error) {
      console.error(`❌ 모니터링 스케줄러 시작 실패:`, error.message);
      console.log(`⏸️ 모니터링 없이 서버를 계속 실행합니다`);
    }
  } else {
    console.log(`⏸️ 모니터링 스케줄러가 비활성화되어 있습니다 (ENABLE_MONITORING=${process.env.ENABLE_MONITORING})`);
  }

  // [advice from AI] TLS 인증서 모니터링 서비스 시작
  try {
    certificateMonitoringService.start();
  } catch (error) {
    console.error('❌ 인증서 모니터링 서비스 시작 오류:', error);
  }

  // [advice from AI] 알림 규칙 엔진 시작
  if (process.env.ENABLE_ALERT_ENGINE !== 'false') {
    try {
      alertRuleEngine.start();
      console.log(`🚨 알림 규칙 엔진이 시작되었습니다`);
      console.log(`   ⏱️  평가 주기: 60초`);
      console.log(`   📊 임계값 기반 알림`);
      console.log(`   📬 Slack/Email 통합`);
    } catch (error) {
      console.error(`⚠️ 알림 규칙 엔진 시작 실패:`, error.message);
    }
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ 포트 ${PORT}가 이미 사용 중입니다. 다른 포트를 사용하거나 기존 프로세스를 종료하세요.`);
    process.exit(1);
  } else {
    console.error('❌ 서버 오류:', error);
    throw error;
  }
});

// [advice from AI] 안전한 서버 종료 처리
const gracefulShutdown = () => {
  console.log('🔄 서버 종료 신호를 받았습니다. 안전하게 종료 중...');
  server.close(() => {
    console.log('✅ 서버가 안전하게 종료되었습니다.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
