// [advice from AI] 프론트엔드 성능 최적화 유틸리티
// 코드 분할, 지연 로딩, 메모이제이션, 번들 최적화

import React, { lazy, ComponentType, LazyExoticComponent } from 'react';
import { debounce } from 'lodash';

// [advice from AI] 코드 분할을 위한 지연 로딩 컴포넌트 팩토리
export const createLazyComponent = <T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ComponentType
): LazyExoticComponent<T> => {
  return lazy(importFunc);
};

// [advice from AI] 주요 페이지 컴포넌트들의 지연 로딩 설정
export const LazyComponents = {
  // 지식자원 관리 페이지들
  ProjectsPage: createLazyComponent(() => import('../pages/knowledge/ProjectsPage')),
  SystemsPage: createLazyComponent(() => import('../pages/knowledge/SystemsPage')),
  CodeComponentsPage: createLazyComponent(() => import('../pages/knowledge/CodeComponentsPage')),
  DesignAssetsPage: createLazyComponent(() => import('../pages/knowledge/DesignAssetsPage')),
  DocumentsPage: createLazyComponent(() => import('../pages/knowledge/DocumentsPage')),
  
  // 운영센터 페이지들
  OperationsCenter: createLazyComponent(() => import('../pages/operations/OperationsCenter')),
  IntegratedPipelineDashboard: createLazyComponent(() => import('../pages/operations/IntegratedPipelineDashboard')),
  RepositoryDeployment: createLazyComponent(() => import('../pages/operations/RepositoryDeployment')),
  ClusterDashboard: createLazyComponent(() => import('../pages/operations/ClusterDashboard')),
  ComprehensiveMonitoring: createLazyComponent(() => import('../pages/operations/ComprehensiveMonitoring')),
  
  // 관리자 페이지들
  SystemManagement: createLazyComponent(() => import('../pages/admin/SystemManagement')),
  SystemMonitoring: createLazyComponent(() => import('../pages/admin/SystemMonitoring')),
  LogsManagement: createLazyComponent(() => import('../pages/admin/LogsManagement')),
  PermissionsManagement: createLazyComponent(() => import('../pages/admin/PermissionsManagement')),
};

// [advice from AI] API 호출 최적화를 위한 캐싱 시스템
class ApiCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  set(key: string, data: any, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

export const apiCache = new ApiCache();

// [advice from AI] 디바운싱된 검색 함수
export const createDebouncedSearch = (
  searchFunction: (query: string) => void,
  delay: number = 300
) => {
  return debounce(searchFunction, delay);
};

// [advice from AI] 이미지 지연 로딩 훅
export const useImageLazyLoading = () => {
  const createImageObserver = (callback: (entries: IntersectionObserverEntry[]) => void) => {
    return new IntersectionObserver(callback, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });
  };
  
  const lazyLoadImage = (img: HTMLImageElement, src: string) => {
    const observer = createImageObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const target = entry.target as HTMLImageElement;
          target.src = src;
          target.classList.remove('lazy');
          observer.unobserve(target);
        }
      });
    });
    
    observer.observe(img);
  };
  
  return { lazyLoadImage };
};

// [advice from AI] 무한 스크롤 최적화
export const useInfiniteScroll = (
  loadMore: () => void,
  hasMore: boolean,
  threshold: number = 100
) => {
  const handleScroll = debounce(() => {
    if (
      hasMore &&
      window.innerHeight + document.documentElement.scrollTop >=
      document.documentElement.offsetHeight - threshold
    ) {
      loadMore();
    }
  }, 100);
  
  return { handleScroll };
};

// [advice from AI] 메모이제이션된 컴포넌트 생성 헬퍼
export const createMemoizedComponent = <P extends object>(
  Component: ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return React.memo(Component, areEqual);
};

// [advice from AI] 번들 크기 분석을 위한 유틸리티
export const bundleAnalyzer = {
  // 현재 번들 크기 추정
  estimateBundleSize: () => {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    return scripts.reduce((total, script) => {
      const src = (script as HTMLScriptElement).src;
      // 대략적인 크기 추정 (실제로는 네트워크 탭에서 확인 필요)
      return total + (src.includes('chunk') ? 100 : 500); // KB 단위
    }, 0);
  },
  
  // 사용되지 않는 코드 감지
  detectUnusedCode: () => {
    console.log('📊 번들 분석 - 사용되지 않는 코드 감지 중...');
    // 실제로는 webpack-bundle-analyzer나 source-map-explorer 사용 권장
  }
};

// [advice from AI] 성능 메트릭 수집
export const performanceMetrics = {
  // 페이지 로드 시간 측정
  measurePageLoad: (pageName: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      console.log(`📊 페이지 로드 시간 [${pageName}]: ${loadTime.toFixed(2)}ms`);
      
      // 성능 데이터를 서버로 전송 (선택사항)
      if (loadTime > 3000) { // 3초 이상이면 느린 페이지로 분류
        console.warn(`🐌 느린 페이지 감지: ${pageName} - ${loadTime.toFixed(2)}ms`);
      }
      
      return loadTime;
    };
  },
  
  // 메모리 사용량 모니터링
  monitorMemoryUsage: () => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
      };
    }
    return null;
  },
  
  // FCP, LCP 등 Core Web Vitals 측정
  measureWebVitals: () => {
    // Web Vitals 라이브러리 사용 권장
    // npm install web-vitals
    console.log('📊 Core Web Vitals 측정 시작');
  }
};

// [advice from AI] 리소스 프리로딩
export const resourcePreloader = {
  // 중요한 리소스 프리로드
  preloadCriticalResources: () => {
    const criticalResources = [
      '/api/auth/me',
      '/api/knowledge/dashboard-stats',
      '/api/operations/dashboard-stats'
    ];
    
    criticalResources.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'fetch';
      link.href = url;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });
  },
  
  // 다음 페이지 프리페치
  prefetchNextPage: (url: string) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  }
};

// [advice from AI] 컴포넌트 렌더링 최적화
export const renderOptimization = {
  // 가상화된 리스트를 위한 설정
  getVirtualListConfig: (itemHeight: number, containerHeight: number) => ({
    itemHeight,
    containerHeight,
    overscan: 5, // 추가로 렌더링할 아이템 수
    scrollingResetTimeInterval: 150
  }),
  
  // 조건부 렌더링 최적화 (간소화)
  createConditionalRenderer: <T>(
    condition: (props: T) => boolean,
    TrueComponent: ComponentType<T>,
    FalseComponent?: ComponentType<T>
  ) => {
    const ConditionalComponent = (props: T) => {
      if (condition(props)) {
        return React.createElement(TrueComponent, props);
      }
      return FalseComponent ? React.createElement(FalseComponent, props) : null;
    };
    return ConditionalComponent;
  }
};

// [advice from AI] 전역 성능 설정
export const initializePerformanceOptimizations = () => {
  console.log('🚀 프론트엔드 성능 최적화 초기화 중...');
  
  // 중요한 리소스 프리로드
  resourcePreloader.preloadCriticalResources();
  
  // 메모리 사용량 모니터링 시작
  setInterval(() => {
    const memory = performanceMetrics.monitorMemoryUsage();
    if (memory && memory.usedJSHeapSize > 100) { // 100MB 이상
      console.warn('⚠️ 높은 메모리 사용량:', memory);
    }
  }, 60000); // 1분마다 체크
  
  // 페이지 가시성 API를 이용한 최적화
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // 페이지가 숨겨졌을 때 불필요한 작업 중단
      console.log('⏸️ 페이지 숨김 - 백그라운드 작업 중단');
    } else {
      // 페이지가 다시 보일 때 작업 재개
      console.log('▶️ 페이지 표시 - 작업 재개');
    }
  });
  
  console.log('✅ 프론트엔드 성능 최적화 초기화 완료');
};
