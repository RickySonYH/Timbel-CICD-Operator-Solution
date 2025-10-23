// [advice from AI] 프로덕션 레벨 토큰 타이머 관리 훅
// JWT 토큰의 만료 시간을 실시간으로 추적하고 관리하는 전용 훅

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useJwtAuthStore } from '../store/jwtAuthStore';

export interface TokenTimeInfo {
  /** 토큰 만료 시간 (밀리초) */
  expirationTime: number;
  /** 토큰 발급 시간 (밀리초) */
  issuedTime: number;
  /** 남은 시간 (밀리초) */
  remainingTime: number;
  /** 전체 유효 시간 (밀리초) */
  totalDuration: number;
  /** 진행률 (0-100) */
  progressPercentage: number;
  /** 만료 여부 */
  isExpired: boolean;
  /** 만료 임박 여부 (5분 미만) */
  isExpiringSoon: boolean;
  /** 만료 위험 여부 (1분 미만) */
  isCritical: boolean;
  /** 포맷된 남은 시간 문자열 */
  formattedTime: string;
  /** 만료까지 남은 시간 상태 */
  timeStatus: 'safe' | 'warning' | 'danger' | 'critical' | 'expired';
}

export interface TokenTimerConfig {
  /** 업데이트 간격 (밀리초, 기본: 1000ms) */
  updateInterval?: number;
  /** 경고 임계값 (분, 기본: 30분) */
  warningThreshold?: number;
  /** 위험 임계값 (분, 기본: 10분) */
  dangerThreshold?: number;
  /** 치명적 임계값 (분, 기본: 5분) */
  criticalThreshold?: number;
  /** 자동 갱신 시도 여부 */
  autoRefresh?: boolean;
  /** 자동 갱신 시도 시점 (분, 기본: 10분) */
  autoRefreshThreshold?: number;
}

const DEFAULT_CONFIG: Required<TokenTimerConfig> = {
  updateInterval: 1000,
  warningThreshold: 30,
  dangerThreshold: 10,
  criticalThreshold: 5,
  autoRefresh: false,
  autoRefreshThreshold: 10
};

/**
 * JWT 토큰의 만료 시간을 파싱하고 시간 정보를 추출하는 함수
 */
const parseTokenTime = (token: string): { exp: number; iat: number } | null => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      exp: payload.exp * 1000, // 초를 밀리초로 변환
      iat: payload.iat * 1000  // 초를 밀리초로 변환
    };
  } catch (error) {
    console.error('토큰 파싱 오류:', error);
    return null;
  }
};

/**
 * 시간을 사람이 읽기 쉬운 형태로 포맷하는 함수
 */
const formatTime = (milliseconds: number): string => {
  if (milliseconds <= 0) return '만료됨';
  
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}시간 ${minutes}분`;
  } else if (minutes > 0) {
    return `${minutes}분 ${seconds}초`;
  } else {
    return `${seconds}초`;
  }
};

/**
 * 시간 상태를 결정하는 함수
 */
const getTimeStatus = (
  remainingMinutes: number, 
  config: Required<TokenTimerConfig>
): TokenTimeInfo['timeStatus'] => {
  if (remainingMinutes <= 0) return 'expired';
  if (remainingMinutes <= config.criticalThreshold) return 'critical';
  if (remainingMinutes <= config.dangerThreshold) return 'danger';
  if (remainingMinutes <= config.warningThreshold) return 'warning';
  return 'safe';
};

/**
 * JWT 토큰 타이머 관리 훅 (안전 버전)
 * 
 * @param config 토큰 타이머 설정
 * @returns 토큰 시간 정보와 관련 함수들
 */
export const useTokenTimer = (config: TokenTimerConfig = {}): {
  tokenInfo: TokenTimeInfo | null;
  refreshToken: () => Promise<boolean>;
  isRefreshing: boolean;
  lastRefreshTime: number | null;
  canRefresh: boolean;
} => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { token, logout } = useJwtAuthStore();
  
  const [tokenInfo, setTokenInfo] = useState<TokenTimeInfo | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastWarningRef = useRef<TokenTimeInfo['timeStatus'] | null>(null);
  const isUpdatingRef = useRef(false); // [advice from AI] 업데이트 중복 방지

  /**
   * 토큰 정보를 안전하게 계산하고 업데이트하는 함수
   */
  const updateTokenInfo = React.useCallback(() => {
    // [advice from AI] 중복 업데이트 방지
    if (isUpdatingRef.current) return;
    isUpdatingRef.current = true;

    try {
      if (!token) {
        setTokenInfo(null);
        return;
      }

      const tokenTime = parseTokenTime(token);
      if (!tokenTime) {
        setTokenInfo(null);
        return;
      }

      const now = Date.now();
      const remainingTime = Math.max(0, tokenTime.exp - now);
      const totalDuration = tokenTime.exp - tokenTime.iat;
      const progressPercentage = Math.max(0, Math.min(100, 
        ((totalDuration - remainingTime) / totalDuration) * 100
      ));
      const remainingMinutes = remainingTime / (1000 * 60);

      const newTokenInfo: TokenTimeInfo = {
        expirationTime: tokenTime.exp,
        issuedTime: tokenTime.iat,
        remainingTime,
        totalDuration,
        progressPercentage,
        isExpired: remainingTime <= 0,
        isExpiringSoon: remainingMinutes <= mergedConfig.criticalThreshold,
        isCritical: remainingMinutes <= 1,
        formattedTime: formatTime(remainingTime),
        timeStatus: getTimeStatus(remainingMinutes, mergedConfig)
      };

      // [advice from AI] 상태 변경이 있을 때만 업데이트
      setTokenInfo(prevInfo => {
        if (!prevInfo) return newTokenInfo;
        
        // 초 단위 차이가 5초 이상일 때만 업데이트 (과도한 업데이트 방지)
        const timeDiff = Math.abs(prevInfo.remainingTime - newTokenInfo.remainingTime);
        const statusChanged = prevInfo.timeStatus !== newTokenInfo.timeStatus;
        
        if (timeDiff > 5000 || statusChanged || newTokenInfo.isExpired) {
          return newTokenInfo;
        }
        return prevInfo;
      });

      // 자동 로그아웃 처리 (토큰이 만료되고 갱신 중이 아닐 때만)
      if (newTokenInfo.isExpired && !isRefreshing) {
        console.warn('🔴 토큰이 만료되어 자동 로그아웃합니다.');
        setTimeout(() => logout(), 100); // [advice from AI] 비동기 로그아웃으로 안전성 확보
        return;
      }

    } catch (error) {
      console.error('토큰 업데이트 중 오류:', error);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [token, logout, mergedConfig.criticalThreshold, isRefreshing]);

  /**
   * 토큰 갱신 함수
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (!token || isRefreshing) {
      return false;
    }

    try {
      setIsRefreshing(true);
      
      // API URL 결정
      const getApiUrl = () => {
        const currentHost = window.location.host;
        if (currentHost === 'localhost:3000' || currentHost === '127.0.0.1:3000') {
          return 'http://localhost:3001';
        } else {
          return `http://${currentHost.split(':')[0]}:3001`;
        }
      };

      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.jwtToken) {
          // Zustand store 업데이트
          useJwtAuthStore.setState({
            token: data.data.jwtToken,
            user: data.data.user || useJwtAuthStore.getState().user
          });
          
          setLastRefreshTime(Date.now());
          console.log('✅ 토큰이 성공적으로 갱신되었습니다.');
          
          // 갱신 성공 이벤트 발생
          const event = new CustomEvent('tokenRefreshed', {
            detail: { newToken: data.data.jwtToken, timestamp: Date.now() }
          });
          window.dispatchEvent(event);
          
          return true;
        }
      }

      console.error('❌ 토큰 갱신 실패:', response.status);
      return false;
      
    } catch (error) {
      console.error('❌ 토큰 갱신 중 오류:', error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [token, isRefreshing]);

  /**
   * 토큰 갱신 가능 여부 확인
   */
  const canRefresh = React.useMemo(() => {
    if (!tokenInfo || isRefreshing) return false;
    
    // 만료된 토큰은 갱신 불가
    if (tokenInfo.isExpired) return false;
    
    // 너무 자주 갱신하는 것을 방지 (최소 5분 간격)
    if (lastRefreshTime && (Date.now() - lastRefreshTime) < 5 * 60 * 1000) {
      return false;
    }
    
    // 남은 시간이 1시간 이상이면 갱신 불필요
    if (tokenInfo.remainingTime > 60 * 60 * 1000) {
      return false;
    }
    
    return true;
  }, [tokenInfo, isRefreshing, lastRefreshTime]);

  /**
   * 자동 갱신 로직
   */
  useEffect(() => {
    if (mergedConfig.autoRefresh && tokenInfo && canRefresh) {
      const remainingMinutes = tokenInfo.remainingTime / (1000 * 60);
      
      if (remainingMinutes <= mergedConfig.autoRefreshThreshold && 
          remainingMinutes > mergedConfig.criticalThreshold) {
        console.log('🔄 자동 토큰 갱신을 시도합니다...');
        refreshToken();
      }
    }
  }, [tokenInfo, canRefresh, mergedConfig.autoRefresh, mergedConfig.autoRefreshThreshold, mergedConfig.criticalThreshold, refreshToken]);

  /**
   * 타이머 설정 및 정리 - 무한 루프 방지
   */
  useEffect(() => {
    if (token) {
      // 즉시 한 번 실행
      updateTokenInfo();
      
      // 주기적 업데이트 설정 (5초 간격으로 변경하여 부하 감소)
      intervalRef.current = setInterval(() => {
        updateTokenInfo();
      }, 5000);
    } else {
      setTokenInfo(null);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [token]); // [advice from AI] updateTokenInfo 의존성 제거로 무한 루프 방지

  /**
   * 컴포넌트 언마운트 시 정리
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    tokenInfo,
    refreshToken,
    isRefreshing,
    lastRefreshTime,
    canRefresh
  };
};

export default useTokenTimer;
