// [advice from AI] 프론트엔드 성능 최적화 유틸리티
import { useState, useEffect, useCallback } from 'react';

// [advice from AI] API 응답 캐시
const apiCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// [advice from AI] 캐시된 API 호출
export const useCachedAPI = (url: string, options: RequestInit = {}, ttl = 300000) => { // 5분 TTL
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 캐시 확인
      const cached = apiCache.get(url);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < cached.ttl) {
        setData(cached.data);
        setLoading(false);
        return;
      }

      // API 호출
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const result = await response.json();
      
      // 캐시 저장
      apiCache.set(url, {
        data: result,
        timestamp: now,
        ttl: ttl
      });

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [url, options, ttl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

// [advice from AI] 디바운스된 검색
export const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// [advice from AI] 가상화된 테이블 (대용량 데이터 처리)
export const useVirtualizedTable = (data: any[], itemHeight = 50) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 });
  const [containerHeight, setContainerHeight] = useState(600);

  const visibleData = data.slice(visibleRange.start, visibleRange.end);
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = event.currentTarget.scrollTop;
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 5, data.length); // 5개 버퍼

    setVisibleRange({ start, end });
  }, [data.length, itemHeight, containerHeight]);

  return {
    visibleData,
    totalHeight: data.length * itemHeight,
    handleScroll,
    setContainerHeight
  };
};

// [advice from AI] 메모리 사용량 모니터링
export const useMemoryMonitor = () => {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  useEffect(() => {
    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        });
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 10000); // 10초마다

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
};

// [advice from AI] API 요청 최적화
export const optimizedFetch = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=300', // 5분 캐시
        ...options.headers
      }
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// [advice from AI] 캐시 관리
export const clearAPICache = () => {
  apiCache.clear();
};

export const getCacheStats = () => {
  return {
    size: apiCache.size,
    keys: Array.from(apiCache.keys())
  };
};
