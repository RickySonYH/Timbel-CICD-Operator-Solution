// [advice from AI] 간단하고 견고한 인증 서비스

import { LoginRequest, RegisterRequest, AuthUser, PermissionLevel } from '../types/auth';
import { SecurityUtils } from '../utils/security';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

export class AuthService {
  // [advice from AI] 사용자 로그인 (이메일 또는 사용자명)
  static async login(loginData: LoginRequest): Promise<{ user: AuthUser; token: string; refreshToken: string }> {
    const { loginId, password } = loginData;

    // 사용자 조회
    const dbUser = await UserModel.findByLoginId(loginId);
    if (!dbUser) {
      throw new Error('사용자를 찾을 수 없습니다');
    }

    if (dbUser.status !== 'active') {
      throw new Error('비활성화된 계정입니다');
    }

    // 비밀번호 검증
    const isPasswordValid = await SecurityUtils.verifyPassword(password, dbUser.password_hash);
    if (!isPasswordValid) {
      logger.warn(`Failed login attempt for user: ${SecurityUtils.maskSensitiveData(loginId)}`);
      throw new Error('잘못된 비밀번호입니다');
    }

    // 마지막 로그인 시간 업데이트
    await UserModel.updateLastLogin(dbUser.id);

    // JWT 토큰 생성
    const tokenPayload = {
      userId: dbUser.id,
      email: dbUser.email,
      permissionLevel: dbUser.permission_level,
      sessionId: SecurityUtils.generateSecureToken()
    };

    const { accessToken, refreshToken } = SecurityUtils.generateTokens(tokenPayload);
    console.log('Generated accessToken length:', accessToken.length);
    console.log('Generated accessToken preview:', accessToken.substring(0, 50) + '...');
    
    // AuthUser 객체 생성
    const authUser = UserModel.toAuthUser(dbUser);

    logger.info(`User logged in: ${SecurityUtils.maskSensitiveData(dbUser.email)}`);

    return { 
      user: authUser, 
      token: accessToken,
      refreshToken 
    };
  }

  // [advice from AI] 토큰 검증
  static async verifyToken(token: string): Promise<AuthUser> {
    try {
      const decoded = SecurityUtils.verifyAccessToken(token) as any;
      
      const dbUser = await UserModel.findById(decoded.userId);
      if (!dbUser) {
        throw new Error('사용자를 찾을 수 없습니다');
      }

      if (dbUser.status !== 'active') {
        throw new Error('비활성화된 계정입니다');
      }

      return UserModel.toAuthUser(dbUser);
    } catch (error) {
      throw new Error('유효하지 않은 토큰입니다');
    }
  }

  // [advice from AI] 일반 사용자 회원가입 (승인 대기)
  static async registerUser(userData: RegisterRequest & { 
    department: string; 
    position: string; 
    phoneNumber?: string;
    reason?: string;
  }): Promise<{ user: AuthUser; message: string }> {
    
    // 유효성 검증
    const passwordValidation = SecurityUtils.validatePassword(userData.password);
    if (!passwordValidation.isValid) {
      throw new Error(`비밀번호 정책 위반: ${passwordValidation.errors.join(', ')}`);
    }

    if (!SecurityUtils.validateEmail(userData.email)) {
      throw new Error('유효하지 않은 이메일 형식입니다');
    }

    const usernameValidation = SecurityUtils.validateUsername(userData.username);
    if (!usernameValidation.isValid) {
      throw new Error(usernameValidation.error || '유효하지 않은 사용자명입니다');
    }

    // 중복 사용자 확인
    const existingUser = await UserModel.findByLoginId(userData.email);
    const existingUsername = await UserModel.findByLoginId(userData.username);
    
    if (existingUser || existingUsername) {
      throw new Error('이미 존재하는 이메일 또는 사용자명입니다');
    }

    // 비밀번호 해싱
    const passwordHash = await SecurityUtils.hashPassword(userData.password);

    // 사용자 생성
    const dbUser = await UserModel.create({
      username: userData.username,
      email: userData.email,
      password_hash: passwordHash,
      full_name: userData.fullName,
      department: userData.department,
      position: userData.position,
      permission_level: 2, // Member 레벨
      status: 'pending' // 승인 대기
    });

    logger.info(`New user registration: ${SecurityUtils.maskSensitiveData(userData.email)}`);

    return {
      user: UserModel.toAuthUser(dbUser),
      message: '회원가입 신청이 완료되었습니다. 관리자 승인 후 이용 가능합니다.'
    };
  }
}