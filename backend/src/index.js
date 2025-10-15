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

// [advice from AI] 세션 기반 인증 미들웨어
const SessionAuthMiddleware = require('./middleware/sessionAuth');

// [advice from AI] JWT 기반 인증 미들웨어
const jwtAuth = require('./middleware/jwtAuth');
const { 
  generalLimiter, 
  authLimiter, 
  requestLogger, 
  validateInput 
} = require('./middleware/securityEnhancement');

// 미들웨어 설정
dotenv.config();

// [advice from AI] PostgreSQL 연결 설정
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: process.env.DB_NAME || 'timbel_cicd_operator',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

const app = express();
const PORT = process.env.PORT || 3001;

// [advice from AI] 세션 인증 미들웨어 인스턴스 생성
const sessionAuth = new SessionAuthMiddleware();

// [advice from AI] 보안 미들웨어 설정
app.use(helmet());
app.use(compression()); // 응답 압축 활성화
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://rdc.rickyson.com:3000',
    'http://localhost:3001'
  ],
  credentials: true // 쿠키 전송 허용
}));

// [advice from AI] 세션 미들웨어 적용 (CORS 이후, 라우트 이전)
app.use(sessionAuth.getSessionMiddleware());

// [advice from AI] Rate limiting 설정 - 임시 비활성화
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15분
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
//   message: 'Too many requests from this IP'
// });
// app.use(limiter);

// 기본 미들웨어
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '50mb' }));
app.use(express.urlencoded({ extended: true }));

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

// [advice from AI] 샘플 계정 목록 조회 API (개발용)
app.get('/api/auth/sample-accounts', async (req, res) => {
  try {
    console.log('🔍 샘플 계정 목록 조회 요청');
    
    const result = await pool.query(`
      SELECT 
        username, 
        email, 
        full_name, 
        role_type,
        status,
        created_at
      FROM timbel_users 
      WHERE status = 'active'
      ORDER BY 
        CASE role_type 
          WHEN 'admin' THEN 1
          WHEN 'executive' THEN 2
          WHEN 'po' THEN 3
          WHEN 'pe' THEN 4
          WHEN 'qa' THEN 5
          ELSE 6
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
app.use('/api/admin', require('./routes/admin'));
app.use('/api/jenkins', require('./routes/jenkins-automation'));
app.use('/api/nexus', require('./routes/nexus-integration'));
app.use('/api/argocd', require('./routes/argocd-integration'));
app.use('/api/prometheus', require('./routes/prometheus-integration'));
app.use('/api/issues', require('./routes/issues-management'));
app.use('/api/pipeline-templates', require('./routes/pipeline-templates'));
app.use('/api/operations', require('./routes/operations'));
app.use('/api/operations', require('./routes/operations-deployment'));
app.use('/api/operations', require('./routes/operations-deployments'));
app.use('/api/operations', require('./routes/operations-dashboard'));
app.use('/api/operations', require('./routes/deployment-management')); // 배포 요청 및 히스토리
app.use('/api/clusters', require('./routes/cluster-management')); // 클러스터 관리
app.use('/api/admin', require('./routes/system-config')); // 시스템 설정
// [advice from AI] 승인 관리 라우트 제거 (지식자원에서 직접 생성 구조로 변경)
app.use('/api/operations/cicd', require('./routes/cicd-pipeline'));
app.use('/api/operations/monitoring', require('./routes/cicd-monitoring'));
app.use('/api/operations/monitoring', require('./routes/build-monitoring'));
app.use('/api/operations/deployment', require('./routes/deployment'));
app.use('/api/operations/deployment', require('./routes/deployment-monitoring'));
app.use('/api/operations/infrastructure', require('./routes/deployment-infrastructure'));
app.use('/api/operations/servers', require('./routes/cicd-servers'));
app.use('/api/operations/simulator', require('./routes/simulator'));

// [advice from AI] 프로젝트 상태 관리 및 히스토리 API  
// app.use('/api/project-status', jwtAuth, require('./routes/project-status-management'));

// [advice from AI] 전역 에러 핸들러 추가
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('스택 트레이스:', error.stack);
  // 서버를 안전하게 종료하지 않고 로그만 기록
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // 서버를 안전하게 종료하지 않고 로그만 기록
});

// [advice from AI] 운영센터 관련 API 라우터만 등록
// [advice from AI] 스케줄러 서비스 (node-cron 패키지 설치 완료)
const SchedulerService = require('./services/schedulerService');

// [advice from AI] 스케줄러 서비스 초기화 (활성화)
const schedulerService = new SchedulerService();

// [advice from AI] 포트 사용 중 에러 처리
const server = app.listen(PORT, async () => {
  console.log(`🚀 Timbel 플랫폼 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`📊 환경: ${process.env.NODE_ENV}`);
  console.log(`🔗 헬스체크: http://localhost:${PORT}/health`);
  console.log(`🚀 운영 센터 API: http://localhost:${PORT}/api/operations`);
  console.log(`📁 프로젝트 API: http://localhost:${PORT}/api/projects`);
  console.log(`🔧 개발 환경 API: http://localhost:${PORT}/api/dev-environment`);
  
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
