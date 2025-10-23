// [advice from AI] 다단계 인증(MFA) 서비스
// TOTP, SMS, Email 기반 2FA 지원

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const { Pool } = require('pg');
const systemLogger = require('../../middleware/systemLogger');
const { globalErrorHandler } = require('../../middleware/globalErrorHandler');

class MultiFactorAuthService {
  constructor() {
    // [advice from AI] 데이터베이스 연결 (사용자 정보는 knowledge DB)
    this.knowledgePool = new Pool({
      host: process.env.DB_HOST || 'postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: 'timbel_knowledge',
      user: process.env.DB_USER || 'timbel_user',
      password: process.env.DB_PASSWORD || 'timbel_password'
    });

    // [advice from AI] MFA 설정
    this.config = {
      issuer: 'Timbel CICD Platform',
      serviceName: 'Timbel',
      window: 2, // TOTP 윈도우 (±2 = 5분)
      tokenLength: 6,
      step: 30, // 30초마다 새 토큰
      encoding: 'base32'
    };

    // [advice from AI] 백업 코드 설정
    this.backupCodeConfig = {
      count: 10,
      length: 8,
      charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    };

    this.initialize();
  }

  async initialize() {
    try {
      await this.createMFATable();
      systemLogger.info('다단계 인증 서비스 초기화 완료');
    } catch (error) {
      systemLogger.error('다단계 인증 서비스 초기화 실패', { error: error.message });
      await globalErrorHandler.handleError(error, { context: 'MultiFactorAuthService.initialize' });
    }
  }

  // [advice from AI] MFA 테이블 생성
  async createMFATable() {
    await this.knowledgePool.query(`
      CREATE TABLE IF NOT EXISTS user_mfa_settings (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES timbel_users(id) ON DELETE CASCADE,
        
        -- TOTP 설정
        totp_enabled BOOLEAN DEFAULT false,
        totp_secret TEXT,
        totp_backup_codes JSONB DEFAULT '[]',
        totp_verified_at TIMESTAMP,
        
        -- SMS 설정
        sms_enabled BOOLEAN DEFAULT false,
        sms_phone_number TEXT,
        sms_verified_at TIMESTAMP,
        
        -- Email 설정
        email_enabled BOOLEAN DEFAULT false,
        email_verified_at TIMESTAMP,
        
        -- 복구 설정
        backup_codes_generated_at TIMESTAMP,
        backup_codes_used JSONB DEFAULT '[]',
        
        -- 보안 설정
        require_mfa BOOLEAN DEFAULT false,
        trusted_devices JSONB DEFAULT '[]',
        last_mfa_at TIMESTAMP,
        failed_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(user_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_mfa_user_id ON user_mfa_settings(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_mfa_require ON user_mfa_settings(require_mfa);
    `);
  }

  // [advice from AI] TOTP 설정 시작
  async setupTOTP(userId, userEmail, userName) {
    try {
      // 기존 설정 확인
      const existingResult = await this.knowledgePool.query(
        'SELECT totp_enabled FROM user_mfa_settings WHERE user_id = $1',
        [userId]
      );

      if (existingResult.rows.length > 0 && existingResult.rows[0].totp_enabled) {
        throw new Error('TOTP가 이미 활성화되어 있습니다.');
      }

      // 새로운 TOTP 시크릿 생성
      const secret = speakeasy.generateSecret({
        name: `${this.config.serviceName} (${userEmail})`,
        issuer: this.config.issuer,
        length: 32
      });

      // QR 코드 생성
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

      // 백업 코드 생성
      const backupCodes = this.generateBackupCodes();

      // 데이터베이스에 임시 저장 (아직 활성화 안됨)
      await this.knowledgePool.query(`
        INSERT INTO user_mfa_settings (user_id, totp_secret, totp_backup_codes, backup_codes_generated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET 
          totp_secret = $2,
          totp_backup_codes = $3,
          backup_codes_generated_at = NOW(),
          updated_at = NOW()
      `, [userId, secret.base32, JSON.stringify(backupCodes)]);

      systemLogger.info('TOTP 설정 시작', {
        userId,
        userEmail,
        hasSecret: !!secret.base32
      });

      return {
        secret: secret.base32,
        qrCode: qrCodeUrl,
        manualEntryKey: secret.base32,
        backupCodes,
        instructions: {
          step1: '인증 앱(Google Authenticator, Authy 등)을 설치하세요.',
          step2: 'QR 코드를 스캔하거나 수동으로 키를 입력하세요.',
          step3: '앱에서 생성된 6자리 코드를 입력하여 설정을 완료하세요.',
          step4: '백업 코드를 안전한 곳에 보관하세요.'
        }
      };

    } catch (error) {
      systemLogger.error('TOTP 설정 시작 실패', { userId, error: error.message });
      throw error;
    }
  }

  // [advice from AI] TOTP 설정 완료 (검증)
  async completeTOTPSetup(userId, token) {
    try {
      // 사용자의 TOTP 설정 조회
      const result = await this.knowledgePool.query(
        'SELECT totp_secret, totp_enabled FROM user_mfa_settings WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0 || !result.rows[0].totp_secret) {
        throw new Error('TOTP 설정이 초기화되지 않았습니다.');
      }

      if (result.rows[0].totp_enabled) {
        throw new Error('TOTP가 이미 활성화되어 있습니다.');
      }

      const secret = result.rows[0].totp_secret;

      // TOTP 토큰 검증
      const verified = speakeasy.totp.verify({
        secret,
        encoding: this.config.encoding,
        token,
        window: this.config.window,
        step: this.config.step
      });

      if (!verified) {
        await this.recordFailedAttempt(userId);
        throw new Error('유효하지 않은 인증 코드입니다.');
      }

      // TOTP 활성화
      await this.knowledgePool.query(`
        UPDATE user_mfa_settings 
        SET totp_enabled = true, 
            totp_verified_at = NOW(),
            require_mfa = true,
            failed_attempts = 0,
            updated_at = NOW()
        WHERE user_id = $1
      `, [userId]);

      systemLogger.info('TOTP 설정 완료', { userId });

      return {
        success: true,
        message: 'TOTP 인증이 성공적으로 설정되었습니다.',
        mfaEnabled: true
      };

    } catch (error) {
      systemLogger.error('TOTP 설정 완료 실패', { userId, error: error.message });
      throw error;
    }
  }

  // [advice from AI] MFA 토큰 검증
  async verifyMFAToken(userId, token, method = 'totp') {
    try {
      // 계정 잠금 확인
      await this.checkAccountLock(userId);

      const result = await this.knowledgePool.query(
        'SELECT * FROM user_mfa_settings WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('MFA가 설정되지 않았습니다.');
      }

      const mfaSettings = result.rows[0];
      let verified = false;

      switch (method) {
        case 'totp':
          verified = await this.verifyTOTP(mfaSettings, token);
          break;
        case 'backup':
          verified = await this.verifyBackupCode(userId, mfaSettings, token);
          break;
        case 'sms':
          verified = await this.verifySMS(userId, token);
          break;
        default:
          throw new Error('지원하지 않는 MFA 방법입니다.');
      }

      if (verified) {
        // 성공 시 실패 횟수 초기화
        await this.knowledgePool.query(`
          UPDATE user_mfa_settings 
          SET failed_attempts = 0, 
              last_mfa_at = NOW(),
              locked_until = NULL
          WHERE user_id = $1
        `, [userId]);

        systemLogger.info('MFA 검증 성공', { userId, method });
        return true;
      } else {
        await this.recordFailedAttempt(userId);
        return false;
      }

    } catch (error) {
      systemLogger.error('MFA 토큰 검증 실패', { userId, method, error: error.message });
      throw error;
    }
  }

  // [advice from AI] TOTP 검증
  async verifyTOTP(mfaSettings, token) {
    if (!mfaSettings.totp_enabled || !mfaSettings.totp_secret) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: mfaSettings.totp_secret,
      encoding: this.config.encoding,
      token,
      window: this.config.window,
      step: this.config.step
    });
  }

  // [advice from AI] 백업 코드 검증
  async verifyBackupCode(userId, mfaSettings, code) {
    const backupCodes = mfaSettings.totp_backup_codes || [];
    const usedCodes = mfaSettings.backup_codes_used || [];

    // 코드가 존재하고 아직 사용되지 않았는지 확인
    if (backupCodes.includes(code) && !usedCodes.includes(code)) {
      // 사용된 코드로 표시
      usedCodes.push(code);
      
      await this.knowledgePool.query(`
        UPDATE user_mfa_settings 
        SET backup_codes_used = $1, updated_at = NOW()
        WHERE user_id = $2
      `, [JSON.stringify(usedCodes), userId]);

      systemLogger.info('백업 코드 사용', { userId, remainingCodes: backupCodes.length - usedCodes.length });
      return true;
    }

    return false;
  }

  // [advice from AI] SMS 인증 (모의 구현)
  async verifySMS(userId, code) {
    // 실제 구현에서는 SMS 서비스(Twilio, AWS SNS 등)와 연동
    // 여기서는 간단한 모의 구현
    const storedCode = await this.getStoredSMSCode(userId);
    return storedCode === code;
  }

  // [advice from AI] MFA 상태 조회
  async getMFAStatus(userId) {
    try {
      const result = await this.knowledgePool.query(
        'SELECT * FROM user_mfa_settings WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          enabled: false,
          methods: [],
          requireMFA: false
        };
      }

      const settings = result.rows[0];
      const methods = [];

      if (settings.totp_enabled) methods.push('totp');
      if (settings.sms_enabled) methods.push('sms');
      if (settings.email_enabled) methods.push('email');

      const backupCodes = settings.totp_backup_codes || [];
      const usedCodes = settings.backup_codes_used || [];

      return {
        enabled: methods.length > 0,
        methods,
        requireMFA: settings.require_mfa,
        totpEnabled: settings.totp_enabled,
        smsEnabled: settings.sms_enabled,
        emailEnabled: settings.email_enabled,
        backupCodesRemaining: backupCodes.length - usedCodes.length,
        lastMFAAt: settings.last_mfa_at,
        trustedDevices: settings.trusted_devices || [],
        isLocked: settings.locked_until && new Date(settings.locked_until) > new Date()
      };

    } catch (error) {
      systemLogger.error('MFA 상태 조회 실패', { userId, error: error.message });
      throw error;
    }
  }

  // [advice from AI] MFA 비활성화
  async disableMFA(userId, confirmationToken) {
    try {
      // 현재 MFA로 한 번 더 검증
      const verified = await this.verifyMFAToken(userId, confirmationToken);
      if (!verified) {
        throw new Error('MFA 인증에 실패했습니다.');
      }

      await this.knowledgePool.query(`
        UPDATE user_mfa_settings 
        SET totp_enabled = false,
            sms_enabled = false,
            email_enabled = false,
            require_mfa = false,
            totp_secret = NULL,
            totp_backup_codes = '[]',
            backup_codes_used = '[]',
            trusted_devices = '[]',
            updated_at = NOW()
        WHERE user_id = $1
      `, [userId]);

      systemLogger.info('MFA 비활성화', { userId });

      return {
        success: true,
        message: 'MFA가 성공적으로 비활성화되었습니다.'
      };

    } catch (error) {
      systemLogger.error('MFA 비활성화 실패', { userId, error: error.message });
      throw error;
    }
  }

  // [advice from AI] 신뢰할 수 있는 디바이스 관리
  async addTrustedDevice(userId, deviceInfo) {
    try {
      const deviceId = crypto.randomBytes(16).toString('hex');
      const device = {
        id: deviceId,
        name: deviceInfo.name || 'Unknown Device',
        userAgent: deviceInfo.userAgent,
        ipAddress: deviceInfo.ipAddress,
        addedAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString()
      };

      const result = await this.knowledgePool.query(
        'SELECT trusted_devices FROM user_mfa_settings WHERE user_id = $1',
        [userId]
      );

      const trustedDevices = result.rows[0]?.trusted_devices || [];
      trustedDevices.push(device);

      // 최대 5개까지만 유지
      if (trustedDevices.length > 5) {
        trustedDevices.sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt));
        trustedDevices.splice(5);
      }

      await this.knowledgePool.query(`
        UPDATE user_mfa_settings 
        SET trusted_devices = $1, updated_at = NOW()
        WHERE user_id = $2
      `, [JSON.stringify(trustedDevices), userId]);

      return deviceId;

    } catch (error) {
      systemLogger.error('신뢰할 수 있는 디바이스 추가 실패', { userId, error: error.message });
      throw error;
    }
  }

  // [advice from AI] 디바이스 신뢰성 확인
  async isDeviceTrusted(userId, deviceFingerprint) {
    try {
      const result = await this.knowledgePool.query(
        'SELECT trusted_devices FROM user_mfa_settings WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) return false;

      const trustedDevices = result.rows[0].trusted_devices || [];
      const device = trustedDevices.find(d => d.id === deviceFingerprint);

      if (device) {
        // 마지막 사용 시간 업데이트
        device.lastUsedAt = new Date().toISOString();
        
        await this.knowledgePool.query(`
          UPDATE user_mfa_settings 
          SET trusted_devices = $1, updated_at = NOW()
          WHERE user_id = $2
        `, [JSON.stringify(trustedDevices), userId]);

        return true;
      }

      return false;

    } catch (error) {
      systemLogger.error('디바이스 신뢰성 확인 실패', { userId, error: error.message });
      return false;
    }
  }

  // [advice from AI] 유틸리티 메서드들

  generateBackupCodes() {
    const codes = [];
    for (let i = 0; i < this.backupCodeConfig.count; i++) {
      let code = '';
      for (let j = 0; j < this.backupCodeConfig.length; j++) {
        const randomIndex = Math.floor(Math.random() * this.backupCodeConfig.charset.length);
        code += this.backupCodeConfig.charset[randomIndex];
      }
      codes.push(code);
    }
    return codes;
  }

  async recordFailedAttempt(userId) {
    await this.knowledgePool.query(`
      UPDATE user_mfa_settings 
      SET failed_attempts = failed_attempts + 1,
          locked_until = CASE 
            WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
            ELSE locked_until
          END,
          updated_at = NOW()
      WHERE user_id = $1
    `, [userId]);
  }

  async checkAccountLock(userId) {
    const result = await this.knowledgePool.query(
      'SELECT locked_until FROM user_mfa_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length > 0 && result.rows[0].locked_until) {
      const lockUntil = new Date(result.rows[0].locked_until);
      if (lockUntil > new Date()) {
        const remainingMinutes = Math.ceil((lockUntil - new Date()) / (1000 * 60));
        throw new Error(`계정이 ${remainingMinutes}분 동안 잠겨있습니다.`);
      }
    }
  }

  async getStoredSMSCode(userId) {
    // SMS 코드 저장/조회 로직 (실제 구현 필요)
    return '123456'; // 모의 코드
  }

  // [advice from AI] 서비스 종료
  async shutdown() {
    try {
      await this.knowledgePool.end();
      systemLogger.info('다단계 인증 서비스 종료 완료');
    } catch (error) {
      systemLogger.error('다단계 인증 서비스 종료 중 오류', { error: error.message });
    }
  }
}

module.exports = MultiFactorAuthService;
