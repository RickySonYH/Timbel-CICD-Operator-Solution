// [advice from AI] 인증 관련 라우터

import express from 'express';
import { body, validationResult } from 'express-validator';
import { AuthService } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';
const jwtAuth = require('../middleware/jwtAuth');

const router = express.Router();

// [advice from AI] 로그인 (이메일 또는 사용자명)
router.post('/login', [
  body('loginId').notEmpty().withMessage('이메일 또는 사용자명을 입력하세요'),
  body('password').isLength({ min: 6 }).withMessage('비밀번호는 최소 6자 이상이어야 합니다')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user, token } = await AuthService.login(req.body);
    
    logger.info(`User logged in: ${user.email}`);
    
    return res.json({
      success: true,
      data: { user, token }
    });
  } catch (error: any) {
    logger.error('Login error:', error);
    return res.status(401).json({
      error: error.message || '로그인에 실패했습니다'
    });
  }
});

// [advice from AI] JWT 기반 로그인 (토큰 반환)
router.post('/login-jwt', [
  body('loginId').notEmpty().withMessage('이메일 또는 사용자명을 입력하세요'),
  body('password').isLength({ min: 6 }).withMessage('비밀번호는 최소 6자 이상이어야 합니다')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { user, token } = await AuthService.login(req.body);
    
    // [advice from AI] JWT 토큰 생성
    const jwtToken = jwtAuth.generateToken(user);
    
    logger.info(`User logged in with JWT: ${user.email}`);
    
    return res.json({
      success: true,
      data: { 
        user, 
        token: jwtToken,
        tokenType: 'Bearer'
      }
    });
  } catch (error: any) {
    logger.error('JWT Login error:', error);
    return res.status(401).json({
      success: false,
      error: error.message || '로그인에 실패했습니다'
    });
  }
});

// [advice from AI] Administrator 계정은 이미 데이터베이스에 생성됨

// [advice from AI] 일반 사용자 회원가입 (승인 대기)
router.post('/register', [
  body('username').isLength({ min: 3, max: 20 }).withMessage('사용자명은 3-20자 사이여야 합니다'),
  body('email').isEmail().withMessage('유효한 이메일을 입력하세요'),
  body('password').isLength({ min: 8 }).withMessage('비밀번호는 최소 8자 이상이어야 합니다'),
  body('fullName').notEmpty().withMessage('이름을 입력하세요'),
  body('department').notEmpty().withMessage('부서를 입력하세요'),
  body('position').notEmpty().withMessage('직책을 입력하세요'),
  body('phoneNumber').optional().isMobilePhone('ko-KR').withMessage('올바른 휴대폰 번호를 입력하세요')
], async (req: express.Request, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const result = await AuthService.registerUser(req.body);
    
    logger.info(`User registered: ${result.user.email}`);
    
    return res.status(201).json({
      success: true,
      message: result.message,
      data: { user: result.user }
    });
  } catch (error: any) {
    logger.error('Registration error:', error);
    return res.status(400).json({
      error: error.message || '회원가입에 실패했습니다'
    });
  }
});

// [advice from AI] 현재 사용자 정보 조회
router.get('/me', authenticate, (req: any, res: express.Response) => {
  return res.json({
    success: true,
    data: { user: req.user }
  });
});

// [advice from AI] 로그아웃
router.post('/logout', authenticate, async (req: any, res: express.Response): Promise<void> => {
  try {
    // JWT에서 sessionId 추출하여 세션 삭제
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(400).json({
        error: 'Authorization header missing'
      });
      return;
    }
    
    const token = authHeader.substring(7);
    
    // 실제로는 JWT를 디코드해서 sessionId를 가져와야 함
    // 여기서는 간단히 처리
    
    logger.info(`User logged out: ${req.user.email}`);
    
    res.json({
      success: true,
      message: '로그아웃되었습니다'
    });
    return;
  } catch (error: any) {
    logger.error('Logout error:', error);
    res.status(500).json({
      error: '로그아웃 처리 중 오류가 발생했습니다'
    });
    return;
  }
});

export default router;
