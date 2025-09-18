// [advice from AI] Timbel 플랫폼 메인 서버 - JavaScript 버전
// TypeScript 오류 해결을 위해 JavaScript로 변환

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const axios = require('axios');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// [advice from AI] 세션 기반 인증 미들웨어
const SessionAuthMiddleware = require('./middleware/sessionAuth');

// 미들웨어 설정
dotenv.config();

// [advice from AI] PostgreSQL 연결 설정
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'timbel_db',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5434,
});

const app = express();
const PORT = process.env.PORT || 3001;

// [advice from AI] 세션 인증 미들웨어 인스턴스 생성
const sessionAuth = new SessionAuthMiddleware();

// [advice from AI] 보안 미들웨어 설정
app.use(helmet());
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

// [advice from AI] 헬스체크 엔드포인트
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, username, loginId, password } = req.body;
    
    // [advice from AI] 로그인 ID 결정 (email, username, loginId 중 하나)
    const identifier = email || username || loginId;
    
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing credentials',
        message: '이메일/사용자명과 비밀번호를 입력해주세요'
      });
    }

    console.log(`🔐 로그인 시도: ${identifier}`);

    // [advice from AI] 데이터베이스에서 사용자 조회
    const result = await pool.query(`
      SELECT id, username, email, password_hash, full_name, role_type, permission_level, work_permissions
      FROM timbel_users 
      WHERE username = $1 OR email = $1
    `, [identifier]);

    if (result.rows.length === 0) {
      console.log(`❌ 사용자 없음: ${identifier}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: '아이디 또는 비밀번호가 잘못되었습니다'
      });
    }

    const user = result.rows[0];
    console.log(`👤 사용자 찾음: ${user.username} (${user.email})`);
    
    // [advice from AI] 비밀번호 검증
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      console.log(`❌ 비밀번호 불일치: ${identifier}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: '아이디 또는 비밀번호가 잘못되었습니다'
      });
    }

    console.log(`✅ 로그인 성공: ${user.username}`);

    // [advice from AI] 세션에 사용자 정보 저장
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      permissionLevel: user.permission_level,
      roleType: user.role_type,
      loginTime: new Date().toISOString()
    };
    
    req.session.lastActivity = new Date().toISOString();

    // [advice from AI] JWT 토큰 생성 (간단하게 정리)
    const jwt = require('jsonwebtoken');
    
    const jwtPayload = {
      userId: user.id,
      email: user.email,
      permissionLevel: user.permission_level,
      roleType: user.role_type,
      sessionId: req.sessionID
    };
    
    const jwtSettings = {
      expiresIn: '24h',
      issuer: 'timbel-platform',
      audience: 'timbel-users'
    };
    
    const jwtToken = jwt.sign(jwtPayload, process.env.JWT_SECRET || 'timbel-super-secret-jwt-key-change-in-production', jwtSettings);

    // [advice from AI] 세션 저장 후 응답
    req.session.save((err) => {
      if (err) {
        console.error('세션 저장 오류:', err);
        return res.status(500).json({
          success: false,
          error: 'Session Save Error',
          message: '세션 저장 중 오류가 발생했습니다'
        });
      }

      return res.json({
        success: true,
        data: {
          user: req.session.user,
          sessionId: req.sessionID,
          jwtToken: jwtToken,
          tokenType: 'Bearer',
          message: '로그인 성공'
        }
      });
    });
  } catch (error) {
    console.error('❌ 로그인 처리 오류:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: '로그인 처리 중 오류가 발생했습니다'
    });
  }
});

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

// [advice from AI] 하드웨어 리소스 계산 엔드포인트 (Fallback 포함)
app.post('/api/operations/calculate-resources', async (req, res) => {
  try {
    const { requirements, gpu_type = 'auto' } = req.body;
    
    if (!requirements) {
      return res.status(400).json({ 
        error: 'Requirements are required',
        message: '서비스 요구사항을 입력해주세요'
      });
    }

    console.log('하드웨어 리소스 계산 요청:', { requirements, gpu_type });

    const result = await rdcService.calculateHardware(requirements, gpu_type);
    res.json(result);
    
  } catch (error) {
    console.error('하드웨어 계산 오류:', error);
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

// [advice from AI] 카탈로그 시스템 라우트
const catalogRouter = require('./routes/catalog');
app.use('/api/catalog', catalogRouter);

// [advice from AI] 시스템 관리 라우트
const adminRouter = require('./routes/admin');
app.use('/api/admin', adminRouter);

// [advice from AI] 디자인 자산 라우트
const designAssetsRouter = require('./routes/designAssets');
app.use('/api/design-assets', designAssetsRouter);

// [advice from AI] 코드 컴포넌트 라우트

// [advice from AI] 문서/가이드 라우트
const documentsRouter = require('./routes/documents');
app.use('/api/documents', documentsRouter);

// [advice from AI] 운영 센터 라우트 추가 (JWT 인증 보호)
const operationsRouter = require('./routes/operations');
app.use('/api/operations', operationsRouter);

// [advice from AI] QA/QC 라우트 추가 (JWT 인증 보호)
const qaRouter = require('./routes/qa');
app.use('/api/qa', qaRouter);

// [advice from AI] ECP-AI 시뮬레이터 라우트 추가 (JWT 인증 보호)
const simulatorRouter = require('./routes/simulator');
app.use('/api/simulator', simulatorRouter);

// [advice from AI] 통합 모니터링 라우트
const monitoringRouter = require('./routes/monitoring');
const catalogCICDRouter = require('./routes/catalogCICD');
app.use('/api/monitoring', monitoringRouter);
app.use('/api/catalog/cicd', catalogCICDRouter);

// [advice from AI] 승인 및 의사결정 라우트
const approvalsRouter = require('./routes/approvals');
app.use('/api/approvals', approvalsRouter);

// [advice from AI] 지식 추출 라우트
const knowledgeExtractionRouter = require('./routes/knowledgeExtraction');
app.use('/api/knowledge-extraction', knowledgeExtractionRouter);

// [advice from AI] 시스템 관리 라우트
const systemsRouter = require('./routes/systems');
const relationshipsRouter = require('./routes/relationships');
const domainsRouter = require('./routes/domains');
const codeComponentsRouter = require('./routes/codeComponents');
app.use('/api/systems', systemsRouter);
app.use('/api/relationships', relationshipsRouter);
app.use('/api/domains', domainsRouter);
// [advice from AI] 코드 컴포넌트 등록 관리용 API (모든 상태 조회)
app.use('/api/code-components', codeComponentsRouter);

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

// [advice from AI] 프로젝트 API 라우터 등록 (간단한 버전)
const projectsRouter = require('./routes/projects-simple');
app.use('/api/projects', projectsRouter);

// [advice from AI] 포트 사용 중 에러 처리
const server = app.listen(PORT, () => {
  console.log(`🚀 Timbel 플랫폼 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`📊 환경: ${process.env.NODE_ENV}`);
  console.log(`🔗 헬스체크: http://localhost:${PORT}/health`);
  console.log(`🚀 운영 센터 API: http://localhost:${PORT}/api/operations`);
  console.log(`📁 프로젝트 API: http://localhost:${PORT}/api/projects`);
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
