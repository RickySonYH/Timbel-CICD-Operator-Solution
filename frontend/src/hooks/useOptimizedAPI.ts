// [advice from AI] 최적화된 API 호출 훅
// 캐싱, 디바운싱, 에러 핸들링, 리트라이 로직 포함

import { useState, useEffect, useCallback, useRef } from 'react';
import axios, { AxiosRequestConfig } from 'axios';

interface UseOptimizedAPIOptions {
  dependencies?: React.DependencyList;
  cacheTime?: number; // 밀리초
  retryCount?: number;
  retryDelay?: number;
  debounceMs?: number;
  enabled?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

interface UseOptimizedAPIResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearCache: () => void;
}

// 글로벌 캐시 저장소
const apiCache = new Map<string, { data: any; timestamp: number; expiry: number }>();

// 진행 중인 요청 추적 (중복 요청 방지)
const pendingRequests = new Map<string, Promise<any>>();

export function useOptimizedAPI<T = any>(
  url: string,
  options: UseOptimizedAPIOptions = {}
): UseOptimizedAPIResult<T> {
  const {
    dependencies = [],
    cacheTime = 5 * 60 * 1000, // 5분 기본 캐시
    retryCount = 3,
    retryDelay = 1000,
    debounceMs = 300,
    enabled = true,
    onSuccess,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // 캐시 키 생성
  const getCacheKey = useCallback(() => {
    const token = localStorage.getItem('jwtToken');
    const userId = token ? JSON.parse(atob(token.split('.')[1])).id : 'anonymous';
    return `${url}_${userId}_${JSON.stringify(dependencies)}`;
  }, [url, dependencies]);

  // 캐시에서 데이터 조회
  const getFromCache = useCallback(() => {
    const cacheKey = getCacheKey();
    const cached = apiCache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    
    if (cached) {
      apiCache.delete(cacheKey); // 만료된 캐시 삭제
    }
    
    return null;
  }, [getCacheKey]);

  // 캐시에 데이터 저장
  const setToCache = useCallback((responseData: T) => {
    const cacheKey = getCacheKey();
    apiCache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now(),
      expiry: Date.now() + cacheTime
    });
  }, [getCacheKey, cacheTime]);

  // 실제 API 호출 함수
  const fetchData = useCallback(async (attempt = 1): Promise<T> => {
    const cacheKey = getCacheKey();
    
    // 이미 진행 중인 동일한 요청이 있으면 그것을 기다림
    if (pendingRequests.has(cacheKey)) {
      return pendingRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const token = localStorage.getItem('jwtToken');
        const config: AxiosRequestConfig = {
          timeout: 10000,
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        };

        const response = await axios.get(url, config);
        
        if (!mountedRef.current) return response.data;
        
        const responseData = response.data;
        setToCache(responseData);
        
        if (onSuccess) {
          onSuccess(responseData);
        }
        
        return responseData;
      } catch (err: any) {
        if (!mountedRef.current) throw err;
        
        // 재시도 로직
        if (attempt < retryCount && err.code !== 'ECONNABORTED') {
          console.warn(`API 요청 실패, 재시도 ${attempt}/${retryCount}:`, url);
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          return fetchData(attempt + 1);
        }
        
        const errorMessage = err.response?.data?.message || err.message || '요청 처리 중 오류가 발생했습니다.';
        
        if (onError) {
          onError(err);
        }
        
        throw new Error(errorMessage);
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }, [url, getCacheKey, setToCache, retryCount, retryDelay, onSuccess, onError]);

  // 디바운싱된 데이터 로딩
  const loadData = useCallback(async () => {
    if (!enabled || !mountedRef.current) return;

    // 디바운싱
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(async () => {
      if (!mountedRef.current) return;

      // 캐시에서 먼저 확인
      const cachedData = getFromCache();
      if (cachedData) {
        setData(cachedData);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const responseData = await fetchData();
        if (mountedRef.current) {
          setData(responseData);
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err.message);
          console.error('API 요청 오류:', err);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, debounceMs);
  }, [enabled, getFromCache, fetchData, debounceMs]);

  // 수동 재요청 함수
  const refetch = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    setError(null);

    try {
      const responseData = await fetchData();
      if (mountedRef.current) {
        setData(responseData);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchData]);

  // 캐시 클리어 함수
  const clearCache = useCallback(() => {
    const cacheKey = getCacheKey();
    apiCache.delete(cacheKey);
  }, [getCacheKey]);

  // 의존성 변경 시 데이터 로딩
  useEffect(() => {
    loadData();
  }, [loadData, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  };
}

// 캐시 관리 유틸리티
export const apiCacheUtils = {
  // 전체 캐시 클리어
  clearAll: () => {
    apiCache.clear();
    pendingRequests.clear();
  },
  
  // 패턴 기반 캐시 클리어
  clearPattern: (pattern: string) => {
    for (const [key] of apiCache.entries()) {
      if (key.includes(pattern)) {
        apiCache.delete(key);
      }
    }
  },
  
  // 캐시 통계
  getStats: () => {
    const now = Date.now();
    const total = apiCache.size;
    const expired = Array.from(apiCache.values()).filter(cache => now >= cache.expiry).length;
    
    return {
      total,
      active: total - expired,
      expired,
      pendingRequests: pendingRequests.size
    };
  }
};