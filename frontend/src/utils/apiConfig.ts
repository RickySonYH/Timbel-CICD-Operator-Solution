// [advice from AI] API 설정 유틸리티 - 도메인에 관계없이 안정적인 API 호출
export const getApiUrl = (): string => {
  // 환경변수에서 API URL 가져오기
  const envApiUrl = process.env.REACT_APP_API_URL;
  
  if (envApiUrl && envApiUrl !== '/api') {
    return envApiUrl;
  }
  
  // 현재 호스트 기반으로 API URL 결정
  const currentHost = window.location.host;
  const currentProtocol = window.location.protocol;
  
  // localhost 또는 rdc.rickyson.com 모두 지원
  if (currentHost.includes('localhost') || currentHost.includes('127.0.0.1')) {
    return '/api'; // nginx 프록시 사용
  }
  
  if (currentHost.includes('rdc.rickyson.com')) {
    return '/api'; // nginx 프록시 사용
  }
  
  // 기본값: 상대 경로
  return '/api';
};

// [advice from AI] 인증 헤더 생성 유틸리티
export const getAuthHeaders = (token?: string): Record<string, string> => {
  const authToken = token || localStorage.getItem('jwtToken') || '';
  
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(authToken && { 'Authorization': `Bearer ${authToken}` })
  };
};

// [advice from AI] 안전한 fetch 래퍼
export const safeFetch = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const apiUrl = getApiUrl();
  const url = endpoint.startsWith('/') ? `${apiUrl}${endpoint}` : `${apiUrl}/${endpoint}`;
  
  const defaultOptions: RequestInit = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  };
  
  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      console.error(`API 오류: ${response.status} ${response.statusText} - ${url}`);
    }
    
    return response;
  } catch (error) {
    console.error(`네트워크 오류: ${error} - ${url}`);
    throw error;
  }
};

// [advice from AI] API 응답 처리 유틸리티
export const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 오류: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'API 요청 실패');
  }
  
  return data.data;
};
