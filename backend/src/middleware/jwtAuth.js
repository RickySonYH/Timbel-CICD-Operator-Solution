// [advice from AI] JWT 토큰 기반 인증 미들웨어
// 세션 기반 인증의 문제점을 해결하고 토큰 기반으로 개선

const jwt = require('jsonwebtoken');

class JWTAuthMiddleware {
  constructor() {
    // [advice from AI] 환경변수에서 Secret Key 가져오기, 없으면 고정값 사용
    this.secretKey = process.env.JWT_SECRET || 'timbel-super-secret-jwt-key-change-in-production';
    this.tokenExpiry = process.env.JWT_EXPIRY || '24h';
    
    // [advice from AI] 계층적 권한 구조 정의
    this.roleHierarchy = {
      'admin': ['admin', 'executive', 'po', 'pe', 'qa', 'operations', 'development'],
      'executive': ['executive', 'po', 'pe', 'qa', 'operations', 'development'],
      'po': ['po', 'pe', 'qa', 'operations', 'development'],
      'pe': ['pe'],
      'qa': ['qa'],
      'operations': ['operations'],
      'development': ['development']
    };
    
    console.log('🔑 JWT 미들웨어 초기화됨');
    console.log('🔑 환경변수 JWT_SECRET:', process.env.JWT_SECRET);
    console.log('🔑 최종 Secret Key:', this.secretKey);
    console.log('🔑 JWT Expiry:', this.tokenExpiry);
    console.log('🔑 권한 계층 구조:', this.roleHierarchy);
  }

  // [advice from AI] JWT 토큰 생성
  generateToken(user) {
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email,
      permissionLevel: user.permissionLevel,
      roleType: user.roleType,
      fullName: user.fullName
    };

    console.log('🔑 토큰 생성 - Secret Key:', this.secretKey);
    console.log('🔑 토큰 생성 - Payload:', payload);

    const token = jwt.sign(payload, this.secretKey, { 
      expiresIn: this.tokenExpiry,
      issuer: 'timbel-platform',
      audience: 'timbel-users'
    });

    console.log('🔑 생성된 토큰 (처음 50자):', token.substring(0, 50) + '...');
    return token;
  }

  // [advice from AI] JWT 토큰 검증
  verifyToken = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: '인증 토큰이 필요합니다'
        });
      }

      const token = authHeader.split(' ')[1]; // Bearer <token>
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: '유효하지 않은 토큰 형식입니다'
        });
      }

      console.log('🔑 JWT 토큰 검증 시작');
      console.log('🔑 검증 Secret Key:', this.secretKey);
      console.log('🔑 받은 토큰 (처음 50자):', token.substring(0, 50) + '...');
      
      const decoded = jwt.verify(token, this.secretKey);
      req.user = decoded;
      
      console.log('✅ JWT 토큰 검증 성공:', decoded.username, decoded.roleType);
      next();

    } catch (error) {
      console.error('❌ JWT 토큰 검증 실패:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'TokenExpired',
          message: '토큰이 만료되었습니다. 다시 로그인해주세요.'
        });
      }
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'InvalidToken',
          message: '유효하지 않은 토큰입니다.'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: '인증에 실패했습니다.'
      });
    }
  }

  // [advice from AI] 권한 레벨 체크
  requirePermission = (requiredLevel) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: '인증이 필요합니다'
        });
      }

      if (req.user.permissionLevel > requiredLevel) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `권한이 부족합니다. 필요한 권한 레벨: ${requiredLevel}, 현재 권한 레벨: ${req.user.permissionLevel}`
        });
      }

      next();
    };
  }

  // [advice from AI] 계층적 역할 기반 접근 제어 - 배열 지원
  requireRole = (requiredRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: '인증이 필요합니다'
        });
      }

      const userRole = req.user.roleType;
      const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      
      // [advice from AI] 배열 중 하나라도 권한이 있으면 통과
      const hasPermission = rolesArray.some(role => this.checkRolePermission(userRole, role));
      
      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `접근 권한이 없습니다. 필요한 역할: ${rolesArray.join(',')}, 현재 역할: ${userRole}`
        });
      }

      console.log(`✅ 권한 검증 성공: ${userRole} -> ${rolesArray.join(',')}`);
      next();
    };
  }

  // [advice from AI] 계층적 권한 검증 메서드
  checkRolePermission(userRole, requiredRole) {
    // [advice from AI] 사용자 역할이 계층 구조에 있는지 확인
    if (!this.roleHierarchy[userRole]) {
      console.log(`❌ 알 수 없는 사용자 역할: ${userRole}`);
      return false;
    }

    // [advice from AI] 사용자 역할이 요구되는 역할에 접근할 수 있는지 확인
    const allowedRoles = this.roleHierarchy[userRole];
    const hasPermission = allowedRoles.includes(requiredRole);
    
    console.log(`🔍 권한 검증: ${userRole} -> ${requiredRole}, 허용된 역할: ${allowedRoles.join(', ')}, 결과: ${hasPermission}`);
    
    return hasPermission;
  }
}

// [advice from AI] JWT 미들웨어 싱글톤 인스턴스 생성
let jwtAuthInstance = null;

function getJWTAuthInstance() {
  if (!jwtAuthInstance) {
    jwtAuthInstance = new JWTAuthMiddleware();
    console.log('🔑 JWT 미들웨어 싱글톤 인스턴스 생성됨');
  }
  return jwtAuthInstance;
}

module.exports = getJWTAuthInstance();
