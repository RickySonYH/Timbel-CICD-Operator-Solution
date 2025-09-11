// [advice from AI] JWT 토큰 기반 인증 스토어
// 세션 기반 인증의 문제점을 해결하고 토큰 기반으로 개선

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  permissionLevel: number;
  roleType: string;
}

interface AuthState {
  // 상태
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  
  // 액션
  login: (loginId: string, password: string) => Promise<boolean>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  getAuthHeaders: () => Record<string, string>;
  clearError: () => void;
}

export const useJwtAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 초기 상태
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,

      // [advice from AI] JWT 로그인
      login: async (loginId: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          console.log('🔐 JWT 로그인 시도:', loginId);
          
          const response = await fetch('http://localhost:3001/api/auth/login-jwt', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ loginId, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ 로그인 실패:', errorData);
            set({ error: errorData.message || '로그인에 실패했습니다', isLoading: false });
            return false;
          }

          const data = await response.json();
          console.log('✅ JWT 로그인 성공:', data.data.user);
          
          set({
            isAuthenticated: true,
            user: data.data.user,
            token: data.data.token,
            isLoading: false,
            error: null
          });

          return true;
        } catch (error) {
          console.error('❌ JWT 로그인 오류:', error);
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: '네트워크 오류가 발생했습니다'
          });
          return false;
        }
      },

      // [advice from AI] 로그아웃
      logout: () => {
        console.log('🚪 JWT 로그아웃');
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null
        });
      },

      // [advice from AI] 로딩 상태 설정
      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      // [advice from AI] 인증 헤더 생성
      getAuthHeaders: (): Record<string, string> => {
        const { token } = get();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
      },

      // [advice from AI] 오류 메시지 초기화
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'jwt-auth-storage', // localStorage 키
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
);
