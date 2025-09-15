// [advice from AI] API 클라이언트 - 토큰 만료 감지 및 자동 로그아웃
import { useJwtAuthStore } from '../store/jwtAuthStore';

// [advice from AI] API 응답 인터페이스
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// [advice from AI] API 클라이언트 클래스
class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3001' 
      : 'http://backend:3001';
  }

  // [advice from AI] 인증 헤더 생성
  private getAuthHeaders(): Record<string, string> {
    const { token } = useJwtAuthStore.getState();
    
    // 토큰이 없으면 에러
    if (!token) {
      throw new Error('토큰이 없습니다. 다시 로그인해주세요.');
    }
    
    return { 'Authorization': `Bearer ${token}` };
  }

  // [advice from AI] HTTP 요청 래퍼
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const headers = {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      };

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // [advice from AI] 401 Unauthorized 응답 처리 (토큰 만료)
      if (response.status === 401) {
        console.log('🔒 인증 실패 - 토큰 만료 또는 무효');
        const { handleTokenExpiration } = useJwtAuthStore.getState();
        handleTokenExpiration();
        throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
      }

      // [advice from AI] 403 Forbidden 응답 처리 (권한 없음)
      if (response.status === 403) {
        console.log('🚫 권한 없음');
        throw new Error('이 기능에 대한 접근 권한이 없습니다.');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error('API 요청 오류:', error);
      throw error;
    }
  }

  // [advice from AI] GET 요청
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // [advice from AI] POST 요청
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // [advice from AI] PUT 요청
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // [advice from AI] DELETE 요청
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// [advice from AI] API 클라이언트 인스턴스 생성
export const apiClient = new ApiClient();

// [advice from AI] 편의 함수들
export const api = {
  get: <T>(endpoint: string) => apiClient.get<T>(endpoint),
  post: <T>(endpoint: string, data?: any) => apiClient.post<T>(endpoint, data),
  put: <T>(endpoint: string, data?: any) => apiClient.put<T>(endpoint, data),
  delete: <T>(endpoint: string) => apiClient.delete<T>(endpoint),
};

export default apiClient;
