// [advice from AI] Timbel 플랫폼 메인 서버 - JavaScript 버전
// TypeScript 오류 해결을 위해 JavaScript로 변환

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const axios = require('axios');

// [advice from AI] 세션 기반 인증 미들웨어
const SessionAuthMiddleware = require('./middleware/sessionAuth');

// 미들웨어 설정
dotenv.config();

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
  const { loginId, password } = req.body;
  
  // [advice from AI] PO-PE-QA-운영팀 구조 역할별 계정 인증
  const roleUsers = {
    'admin': {
      id: 'admin-001',
      username: 'admin',
      email: 'admin@timbel.net',
      fullName: '시스템 관리자',
      permissionLevel: 0,
      roleType: 'admin',
      password: '1q2w3e4r'
    },
    'executive': {
      id: 'exec-001',
      username: 'executive',
      email: 'executive@timbel.com',
      fullName: '최고 관리자',
      permissionLevel: 0,
      roleType: 'executive',
      password: '1q2w3e4r'
    },
    'po': {
      id: 'po-001',
      username: 'pouser',
      email: 'po@timbel.com',
      fullName: 'PO 사용자',
      permissionLevel: 1,
      roleType: 'po',
      password: '1q2w3e4r'
    },
    'pe': {
      id: 'pe-001',
      username: 'peuser',
      email: 'pe@timbel.com',
      fullName: 'PE 사용자',
      permissionLevel: 2,
      roleType: 'pe',
      password: '1q2w3e4r'
    },
    'qa': {
      id: 'qa-001',
      username: 'qauser',
      email: 'qa@timbel.com',
      fullName: 'QA 사용자',
      permissionLevel: 3,
      roleType: 'qa',
      password: '1q2w3e4r'
    },
    'operations': {
      id: 'op-001',
      username: 'opuser',
      email: 'operations@timbel.com',
      fullName: '운영팀 사용자',
      permissionLevel: 4,
      roleType: 'operations',
      password: '1q2w3e4r'
    }
  };

  // [advice from AI] 계정 확인
  const user = Object.values(roleUsers).find(u => 
    (u.username === loginId || u.email === loginId) && u.password === password
  );

  if (user) {
    // [advice from AI] 세션에 사용자 정보 저장
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      permissionLevel: user.permissionLevel,
      roleType: user.roleType,
      loginTime: new Date().toISOString()
    };
    
    req.session.lastActivity = new Date().toISOString();

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
          message: '로그인 성공'
        }
      });
    });
  } else {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid credentials',
      message: '아이디 또는 비밀번호가 잘못되었습니다' 
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

// [advice from AI] 운영 센터 라우트 추가 (JWT 인증 보호)
const operationsRouter = require('./routes/operations');
app.use('/api/operations', operationsRouter);

// [advice from AI] ECP-AI 시뮬레이터 라우트 추가 (JWT 인증 보호)
const simulatorRouter = require('./routes/simulator');
app.use('/api/simulator', simulatorRouter);

// [advice from AI] 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 Timbel 플랫폼 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`📊 환경: ${process.env.NODE_ENV}`);
  console.log(`🔗 헬스체크: http://localhost:${PORT}/health`);
  console.log(`🚀 운영 센터 API: http://localhost:${PORT}/api/operations`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit(0);
});
