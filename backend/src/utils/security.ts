// [advice from AI] 보안 강화 유틸리티
// JWT 토큰 보안, 비밀번호 정책, Rate Limiting 등

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'timbel-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'timbel-refresh-secret';

export class SecurityUtils {
  // [advice from AI] 강력한 비밀번호 정책 검증
  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('비밀번호는 최소 8자 이상이어야 합니다');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('대문자를 최소 1개 포함해야 합니다');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('소문자를 최소 1개 포함해야 합니다');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('숫자를 최소 1개 포함해야 합니다');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('특수문자를 최소 1개 포함해야 합니다');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // [advice from AI] 안전한 비밀번호 해싱 (bcrypt 12 rounds)
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  // [advice from AI] 비밀번호 검증
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  // [advice from AI] 보안 강화된 JWT 토큰 생성
  static generateTokens(payload: any): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      {
        ...payload,
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID() // JWT ID for token tracking
      },
      JWT_SECRET,
      { 
        expiresIn: '15m', // 짧은 만료 시간
        issuer: 'timbel-platform',
        audience: 'timbel-users'
      }
    );

    const refreshToken = jwt.sign(
      {
        userId: payload.userId,
        tokenType: 'refresh',
        iat: Math.floor(Date.now() / 1000),
        jti: crypto.randomUUID()
      },
      JWT_REFRESH_SECRET,
      { 
        expiresIn: '7d', // 7일 만료
        issuer: 'timbel-platform',
        audience: 'timbel-users'
      }
    );

    return { accessToken, refreshToken };
  }

  // [advice from AI] 토큰 검증
  static verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'timbel-platform',
        audience: 'timbel-users'
      });
    } catch (error) {
      throw new Error('유효하지 않은 액세스 토큰입니다');
    }
  }

  // [advice from AI] 리프레시 토큰 검증
  static verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, JWT_REFRESH_SECRET, {
        issuer: 'timbel-platform',
        audience: 'timbel-users'
      });
    } catch (error) {
      throw new Error('유효하지 않은 리프레시 토큰입니다');
    }
  }

  // [advice from AI] 이메일 형식 검증
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // [advice from AI] 사용자명 검증 (영문, 숫자, 언더스코어만 허용)
  static validateUsername(username: string): { isValid: boolean; error?: string } {
    if (username.length < 3 || username.length > 20) {
      return { isValid: false, error: '사용자명은 3-20자 사이여야 합니다' };
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { isValid: false, error: '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다' };
    }
    
    return { isValid: true };
  }

  // [advice from AI] 안전한 랜덤 문자열 생성
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // [advice from AI] IP 주소 추출 (프록시 환경 고려)
  static getClientIP(req: any): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '0.0.0.0';
  }

  // [advice from AI] 민감한 데이터 마스킹
  static maskSensitiveData(data: string, visibleChars: number = 4): string {
    if (data.length <= visibleChars) return '*'.repeat(data.length);
    
    const visible = data.slice(-visibleChars);
    const masked = '*'.repeat(data.length - visibleChars);
    return masked + visible;
  }
}
