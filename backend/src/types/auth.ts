// [advice from AI] 인증 관련 타입 정의

export interface LoginRequest {
  loginId: string;  // 이메일 또는 사용자명
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  department?: string;
  position?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  permissionLevel: number;
  leadershipType?: string;
  organization?: {
    id: string;
    name: string;
    permissionLevel: number;
  };
}

export interface JWTPayload {
  userId: string;
  email: string;
  permissionLevel: number;
  sessionId: string;
}

// [advice from AI] 설계서의 3단계 리더십 체계
export enum PermissionLevel {
  ADMINISTRATOR = 0,  // 최상위 관리자
  LEADER = 1,         // 리더급
  MEMBER = 2          // 팀원급
}

export enum LeadershipType {
  SUPER_ADMIN = 'super_admin',
  TECH_LEAD = 'tech_lead',
  BUSINESS_LEAD = 'business_lead',
  QA_LEAD = 'qa_lead'
}
