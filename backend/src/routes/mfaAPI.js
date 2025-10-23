// [advice from AI] 다단계 인증(MFA) API
// TOTP, SMS, 백업 코드 기반 2FA 관리

const express = require('express');
const router = express.Router();
const jwtAuth = require('../middleware/jwtAuth');
const systemLogger = require('../middleware/systemLogger');
const MultiFactorAuthService = require('../services/security/MultiFactorAuthService');
const rateLimit = require('express-rate-limit');

// [advice from AI] MFA 서비스 인스턴스
const mfaService = new MultiFactorAuthService();

// [advice from AI] MFA 관련 API에 대한 속도 제한
const mfaRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 10, // 최대 10회 시도
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'MFA 요청이 너무 많습니다. 15분 후 다시 시도해주세요.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `mfa_${req.user?.id || req.ip}`
});

const mfaVerifyRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5분
  max: 5, // 최대 5회 검증 시도
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'MFA 검증 시도가 너무 많습니다. 5분 후 다시 시도해주세요.'
  },
  keyGenerator: (req) => `mfa_verify_${req.user?.id || req.ip}`
});

// [advice from AI] MFA 상태 조회
router.get('/status',
  jwtAuth.verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const mfaStatus = await mfaService.getMFAStatus(userId);
      
      res.json({
        success: true,
        data: mfaStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('MFA 상태 조회 오류', { 
        error: error.message,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'MFA 상태 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] TOTP 설정 시작
router.post('/totp/setup',
  jwtAuth.verifyToken,
  mfaRateLimit,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const userEmail = req.user.email;
      const userName = req.user.username;

      const setupData = await mfaService.setupTOTP(userId, userEmail, userName);
      
      systemLogger.info('TOTP 설정 요청', {
        userId,
        userEmail
      });

      res.json({
        success: true,
        data: {
          qrCode: setupData.qrCode,
          manualEntryKey: setupData.manualEntryKey,
          backupCodes: setupData.backupCodes,
          instructions: setupData.instructions
        },
        message: 'TOTP 설정을 위한 QR 코드가 생성되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('TOTP 설정 시작 오류', { 
        error: error.message,
        userId: req.user?.id 
      });
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: error.message || 'TOTP 설정 시작 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] TOTP 설정 완료
router.post('/totp/verify',
  jwtAuth.verifyToken,
  mfaVerifyRateLimit,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { token } = req.body;

      if (!token || token.length !== 6) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: '6자리 인증 코드를 입력해주세요.'
        });
      }

      const result = await mfaService.completeTOTPSetup(userId, token);
      
      systemLogger.info('TOTP 설정 완료', {
        userId,
        success: result.success
      });

      res.json({
        success: true,
        data: result,
        message: 'TOTP 인증이 성공적으로 설정되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('TOTP 설정 완료 오류', { 
        error: error.message,
        userId: req.user?.id 
      });
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: error.message || 'TOTP 설정 완료 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] MFA 토큰 검증
router.post('/verify',
  jwtAuth.verifyToken,
  mfaVerifyRateLimit,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { token, method = 'totp' } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: '인증 토큰이 필요합니다.'
        });
      }

      const verified = await mfaService.verifyMFAToken(userId, token, method);
      
      if (verified) {
        systemLogger.info('MFA 검증 성공', {
          userId,
          method,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        });

        res.json({
          success: true,
          data: { verified: true },
          message: 'MFA 인증이 성공했습니다.',
          timestamp: new Date().toISOString()
        });
      } else {
        systemLogger.warn('MFA 검증 실패', {
          userId,
          method,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        });

        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: '유효하지 않은 인증 코드입니다.'
        });
      }
    } catch (error) {
      systemLogger.error('MFA 토큰 검증 오류', { 
        error: error.message,
        userId: req.user?.id 
      });
      
      if (error.message.includes('잠겨있습니다')) {
        res.status(423).json({
          success: false,
          error: 'AccountLocked',
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'InternalServerError',
          message: 'MFA 검증 중 오류가 발생했습니다.'
        });
      }
    }
  }
);

// [advice from AI] 백업 코드로 검증
router.post('/verify-backup',
  jwtAuth.verifyToken,
  mfaVerifyRateLimit,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { backupCode } = req.body;

      if (!backupCode || backupCode.length !== 8) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: '8자리 백업 코드를 입력해주세요.'
        });
      }

      const verified = await mfaService.verifyMFAToken(userId, backupCode.toUpperCase(), 'backup');
      
      if (verified) {
        systemLogger.info('백업 코드 검증 성공', {
          userId,
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip
        });

        res.json({
          success: true,
          data: { verified: true },
          message: '백업 코드 인증이 성공했습니다.',
          warning: '백업 코드가 사용되었습니다. 남은 코드를 확인하세요.',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: '유효하지 않은 백업 코드입니다.'
        });
      }
    } catch (error) {
      systemLogger.error('백업 코드 검증 오류', { 
        error: error.message,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '백업 코드 검증 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 신뢰할 수 있는 디바이스 추가
router.post('/trusted-device',
  jwtAuth.verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { deviceName } = req.body;

      const deviceInfo = {
        name: deviceName || 'Unknown Device',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      };

      const deviceId = await mfaService.addTrustedDevice(userId, deviceInfo);
      
      systemLogger.info('신뢰할 수 있는 디바이스 추가', {
        userId,
        deviceId,
        deviceName: deviceInfo.name,
        ipAddress: req.ip
      });

      res.json({
        success: true,
        data: { deviceId },
        message: '디바이스가 신뢰할 수 있는 디바이스로 추가되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('신뢰할 수 있는 디바이스 추가 오류', { 
        error: error.message,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '디바이스 추가 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 디바이스 신뢰성 확인
router.get('/trusted-device/:deviceId',
  jwtAuth.verifyToken,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { deviceId } = req.params;

      const isTrusted = await mfaService.isDeviceTrusted(userId, deviceId);
      
      res.json({
        success: true,
        data: { trusted: isTrusted },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('디바이스 신뢰성 확인 오류', { 
        error: error.message,
        userId: req.user?.id,
        deviceId: req.params.deviceId 
      });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '디바이스 확인 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] MFA 비활성화
router.post('/disable',
  jwtAuth.verifyToken,
  mfaVerifyRateLimit,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { confirmationToken } = req.body;

      if (!confirmationToken) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: 'MFA 비활성화를 위한 확인 토큰이 필요합니다.'
        });
      }

      const result = await mfaService.disableMFA(userId, confirmationToken);
      
      systemLogger.info('MFA 비활성화', {
        userId,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      });

      res.json({
        success: true,
        data: result,
        message: 'MFA가 성공적으로 비활성화되었습니다.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('MFA 비활성화 오류', { 
        error: error.message,
        userId: req.user?.id 
      });
      res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: error.message || 'MFA 비활성화 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] 새로운 백업 코드 생성
router.post('/backup-codes/regenerate',
  jwtAuth.verifyToken,
  mfaRateLimit,
  async (req, res) => {
    try {
      const userId = req.user.id;
      const { confirmationToken } = req.body;

      if (!confirmationToken) {
        return res.status(400).json({
          success: false,
          error: 'BadRequest',
          message: '백업 코드 재생성을 위한 확인 토큰이 필요합니다.'
        });
      }

      // MFA 토큰으로 본인 확인
      const verified = await mfaService.verifyMFAToken(userId, confirmationToken);
      if (!verified) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: '유효하지 않은 인증 코드입니다.'
        });
      }

      // 새로운 백업 코드 생성
      const newBackupCodes = mfaService.generateBackupCodes();
      
      // 데이터베이스 업데이트
      await mfaService.knowledgePool.query(`
        UPDATE user_mfa_settings 
        SET totp_backup_codes = $1,
            backup_codes_used = '[]',
            backup_codes_generated_at = NOW(),
            updated_at = NOW()
        WHERE user_id = $2
      `, [JSON.stringify(newBackupCodes), userId]);

      systemLogger.info('백업 코드 재생성', {
        userId,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      });

      res.json({
        success: true,
        data: { backupCodes: newBackupCodes },
        message: '새로운 백업 코드가 생성되었습니다. 안전한 곳에 보관하세요.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('백업 코드 재생성 오류', { 
        error: error.message,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: '백업 코드 재생성 중 오류가 발생했습니다.'
      });
    }
  }
);

// [advice from AI] MFA 통계 (관리자용)
router.get('/statistics',
  jwtAuth.verifyToken,
  jwtAuth.requireRole('admin'),
  async (req, res) => {
    try {
      const result = await mfaService.knowledgePool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN totp_enabled = true THEN 1 END) as totp_users,
          COUNT(CASE WHEN sms_enabled = true THEN 1 END) as sms_users,
          COUNT(CASE WHEN require_mfa = true THEN 1 END) as mfa_required_users,
          COUNT(CASE WHEN locked_until IS NOT NULL AND locked_until > NOW() THEN 1 END) as locked_users,
          AVG(failed_attempts) as avg_failed_attempts
        FROM user_mfa_settings
      `);

      const stats = result.rows[0];

      res.json({
        success: true,
        data: {
          totalUsers: parseInt(stats.total_users) || 0,
          totpUsers: parseInt(stats.totp_users) || 0,
          smsUsers: parseInt(stats.sms_users) || 0,
          mfaRequiredUsers: parseInt(stats.mfa_required_users) || 0,
          lockedUsers: parseInt(stats.locked_users) || 0,
          avgFailedAttempts: parseFloat(stats.avg_failed_attempts) || 0,
          mfaAdoptionRate: stats.total_users > 0 
            ? Math.round((stats.totp_users / stats.total_users) * 100) 
            : 0
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      systemLogger.error('MFA 통계 조회 오류', { 
        error: error.message,
        userId: req.user?.id 
      });
      res.status(500).json({
        success: false,
        error: 'InternalServerError',
        message: 'MFA 통계 조회 중 오류가 발생했습니다.'
      });
    }
  }
);

module.exports = router;
