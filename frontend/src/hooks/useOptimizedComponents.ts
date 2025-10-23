// [advice from AI] 컴포넌트 최적화 훅들
// 메모이제이션, 지연 로딩, 가상화 등

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// 디바운스 훅
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// 스로틀 훅
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastUpdated = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= delay) {
      setThrottledValue(value);
      lastUpdated.current = now;
    } else {
      const timeoutId = setTimeout(() => {
        setThrottledValue(value);
        lastUpdated.current = Date.now();
      }, delay - timeSinceLastUpdate);

      return () => clearTimeout(timeoutId);
    }
  }, [value, delay]);

  return throttledValue;
}

// 교차점 관찰자 (Intersection Observer) 훅
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
): [React.RefObject<HTMLDivElement>, boolean] {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    });

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [options]);

  return [ref, isIntersecting];
}

// 무한 스크롤 훅
export function useInfiniteScroll<T>(
  fetchMore: () => Promise<T[]>,
  hasMore: boolean,
  threshold = 0.8
) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    setError(null);

    try {
      const newItems = await fetchMore();
      setItems(prev => [...prev, ...newItems]);
    } catch (err: any) {
      setError(err.message || '데이터 로딩 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [fetchMore, hasMore, loading]);

  const [sentinelRef, isIntersecting] = useIntersectionObserver({
    threshold,
    rootMargin: '100px'
  });

  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      loadMore();
    }
  }, [isIntersecting, hasMore, loading, loadMore]);

  return {
    items,
    loading,
    error,
    loadMore,
    sentinelRef,
    reset: () => setItems([])
  };
}

// 가상화된 리스트 훅
export function useVirtualizedList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = start + visibleCount;

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length, end + overscan),
      offsetY: Math.max(0, start - overscan) * itemHeight
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY: visibleRange.offsetY,
    handleScroll
  };
}

// 로컬 스토리지 동기화 훅
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

// 이전 값 추적 훅
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// 마운트 상태 추적 훅
export function useIsMounted(): () => boolean {
  const isMountedRef = useRef(true);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  return useCallback(() => isMountedRef.current, []);
}

// 성능 측정 훅
export function usePerformanceMonitor(name: string) {
  const startTime = useRef<number>(performance.now());
  
  useEffect(() => {
    startTime.current = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime.current;
      
      // 개발 환경에서만 로깅
      if (process.env.NODE_ENV === 'development') {
        console.log(`🎯 Performance [${name}]: ${duration.toFixed(2)}ms`);
        
        // Performance API에 기록
        if (window.performance && window.performance.mark) {
          window.performance.mark(`${name}-end`);
          window.performance.measure(name, `${name}-start`, `${name}-end`);
        }
      }
    };
  }, [name]);
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && window.performance && window.performance.mark) {
      window.performance.mark(`${name}-start`);
    }
  }, [name]);
}

// 배치 업데이트 훅
export function useBatchedUpdates<T>(
  initialValue: T,
  batchDelay = 100
): [T, (updater: (prev: T) => T) => void, () => void] {
  const [value, setValue] = useState<T>(initialValue);
  const pendingUpdates = useRef<((prev: T) => T)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((updater: (prev: T) => T) => {
    pendingUpdates.current.push(updater);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setValue(prev => {
        const updates = pendingUpdates.current;
        pendingUpdates.current = [];
        return updates.reduce((acc, update) => update(acc), prev);
      });
    }, batchDelay);
  }, [batchDelay]);

  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      setValue(prev => {
        const updates = pendingUpdates.current;
        pendingUpdates.current = [];
        return updates.reduce((acc, update) => update(acc), prev);
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [value, batchUpdate, flushUpdates];
}
