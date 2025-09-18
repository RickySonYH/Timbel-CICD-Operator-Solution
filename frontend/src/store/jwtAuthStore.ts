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
  // [advice from AI] 토큰 만료 감지 및 자동 로그아웃
  handleTokenExpiration: () => void;
  checkTokenExpiration: () => boolean;
}

// [advice from AI] 토큰 만료 감지 유틸리티 함수
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('토큰 파싱 오류:', error);
    return true;
  }
};

// [advice from AI] 자동 로그아웃 및 리다이렉트 함수
const handleAutoLogout = () => {
  console.log('🔄 토큰 만료로 인한 자동 로그아웃');
  
  // 로컬 스토리지에서 인증 정보 제거
  localStorage.removeItem('jwt-auth-storage');
  
  // Zustand store 상태 초기화
  useJwtAuthStore.setState({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: false,
    error: '세션이 만료되었습니다. 다시 로그인해주세요.'
  });
  
  // 로그인 페이지로 리다이렉트
  window.location.href = '/login';
};

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
          
          // [advice from AI] 동적 API URL 감지 - 내부/외부 접속 자동 구분
          const getApiUrl = () => {
            const currentHost = window.location.host;
            if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
              // 내부 접속 - 직접 백엔드 포트로
              return 'http://localhost:3001';
            } else {
              // 외부 접속 - Nginx 프록시를 통해
              return '/api';
            }
          };
          
          const apiUrl = getApiUrl();
          const response = await fetch(`${apiUrl}/auth/login`, {
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
            token: data.data.jwtToken, // 실제 JWT 토큰 사용
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

      // [advice from AI] 토큰 만료 감지 및 자동 로그아웃
      handleTokenExpiration: () => {
        const { token } = get();
        if (token && isTokenExpired(token)) {
          console.log('⏰ 토큰이 만료되었습니다');
          handleAutoLogout();
        }
      },

      // [advice from AI] 토큰 만료 여부 확인
      checkTokenExpiration: (): boolean => {
        const { token } = get();
        if (!token) return true;
        
        const expired = isTokenExpired(token);
        if (expired) {
          console.log('⏰ 토큰이 만료되었습니다');
          handleAutoLogout();
        }
        return expired;
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
