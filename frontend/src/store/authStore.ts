// [advice from AI] Zustand 기반 인증 상태 관리

import { create } from 'zustand';
// [advice from AI] persist 미들웨어 제거 - 세션 기반 인증으로 변경

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  permissionLevel: number;
  roleType?: string; // 'executive', 'po', 'pe', 'qa', 'operations'
  leadershipType?: string;
  organization?: {
    id: string;
    name: string;
    permissionLevel: number;
  };
}

export interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  department: string;
  position: string;
  phoneNumber?: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (loginId: string, password: string) => Promise<void>;
  register: (formData: RegisterFormData) => Promise<void>;
  logout: () => void;
  setUser: (user: AuthUser, token: string) => void;
  clearError: () => void;
  checkAuth: () => Promise<void>;
  refreshSession: () => Promise<boolean>; // [advice from AI] 세션 갱신 함수 추가
}

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// [advice from AI] PO-PE-QA-운영팀 구조 역할별 계정 데이터 + 기존 admin 계정
const ROLE_USERS = {
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

export const useAuthStore = create<AuthState>()((set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (loginId: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          // [advice from AI] 역할별 계정 로그인 처리 (프론트엔드 임시)
          const roleUser = Object.values(ROLE_USERS).find(user => 
            user.username === loginId && user.password === password
          );

          if (roleUser) {
            const { password: _, ...userData } = roleUser;
            const token = `mock-token-${userData.id}-${Date.now()}`;
            
            set({
              user: userData,
              token,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            return;
          }

          // [advice from AI] 기존 API 로그인 (백엔드 연동 시)
          const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', // [advice from AI] 쿠키 전송 허용
            body: JSON.stringify({ loginId, password }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || '로그인에 실패했습니다');
          }

          const user = data.data.user;
          
          set({
            user,
            token: null, // [advice from AI] 토큰 제거 - 세션 기반 인증
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false,
            isAuthenticated: false
          });
          throw error;
        }
      },

      register: async (formData: RegisterFormData) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || '회원가입에 실패했습니다');
          }

          set({
            isLoading: false,
            error: null
          });

          return data;
        } catch (error: any) {
          set({
            error: error.message,
            isLoading: false
          });
          throw error;
        }
      },

      logout: async () => {
        try {
          // [advice from AI] 서버에 로그아웃 요청 (세션 삭제)
          await fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include' // 쿠키 포함
          });
        } catch (error) {
          console.error('로그아웃 API 오류:', error);
        }
        
        // [advice from AI] 클라이언트 상태 초기화
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        });
      },

      setUser: (user: AuthUser, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
          error: null
        });
      },

      clearError: () => {
        set({ error: null });
      },

      checkAuth: async () => {
        console.log('🔍 세션 확인 시작...');
        
        try {
          // [advice from AI] 세션 기반 인증 확인
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            method: 'GET',
            credentials: 'include' // 쿠키 포함
          });

          const data = await response.json();
          console.log('📡 세션 확인 응답:', { status: response.status, data });

          if (response.ok && data.success) {
            console.log('✅ 세션 유효 - 로그인 상태 유지');
            set({
              user: data.data.user,
              isAuthenticated: true,
              token: null // 세션 기반이므로 토큰 불필요
            });
          } else {
            console.log('❌ 세션 무효 - 로그아웃 상태로 전환');
            // [advice from AI] 세션이 없거나 만료된 경우 로그아웃 상태로 설정
            set({
              user: null,
              token: null,
              isAuthenticated: false
            });
          }
        } catch (error) {
          console.error('💥 세션 확인 오류:', error);
          // [advice from AI] API 연결 실패 시 로그아웃 상태로 설정
          set({
            user: null,
            token: null,
            isAuthenticated: false
          });
        }
      },

      // [advice from AI] 세션 갱신 함수 추가
      refreshSession: async () => {
        console.log('🔄 세션 갱신 시도...');
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/session-status`, {
            method: 'GET',
            credentials: 'include'
          });

          const data = await response.json();
          
          if (response.ok && data.success && data.data.authenticated) {
            console.log('✅ 세션 갱신 성공');
            return true;
          } else {
            console.log('❌ 세션 갱신 실패 - 재로그인 필요');
            set({
              user: null,
              token: null,
              isAuthenticated: false
            });
            return false;
          }
        } catch (error) {
          console.error('💥 세션 갱신 오류:', error);
          return false;
        }
      }
    }));
