// [advice from AI] 안전한 토큰 만료 알림 시스템
// 무한 루프 없이 기본적인 알림만 제공

import { useEffect, useRef } from 'react';
import { useTokenTimer } from './useTokenTimer';

export interface SimpleNotificationConfig {
  /** 10분 전 알림 활성화 여부 */
  enable10MinWarning?: boolean;
  /** 5분 전 알림 활성화 여부 */
  enable5MinWarning?: boolean;
  /** 1분 전 알림 활성화 여부 */
  enable1MinWarning?: boolean;
  /** 브라우저 알림 사용 여부 */
  useBrowserNotification?: boolean;
}

const DEFAULT_CONFIG: Required<SimpleNotificationConfig> = {
  enable10MinWarning: true,
  enable5MinWarning: true,
  enable1MinWarning: true,
  useBrowserNotification: true
};

/**
 * 브라우저 알림 권한 요청
 */
const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

/**
 * 브라우저 알림 표시
 */
const showBrowserNotification = (title: string, message: string) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: message,
      icon: '/favicon.ico',
      tag: 'token-warning',
      requireInteraction: false
    });

    // 5초 후 자동 닫기
    setTimeout(() => {
      notification.close();
    }, 5000);

    return notification;
  }
  return null;
};

/**
 * 안전한 토큰 만료 알림 훅
 */
export const useSimpleTokenNotifications = (config: SimpleNotificationConfig = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { tokenInfo } = useTokenTimer();
  const notifiedRef = useRef<Set<string>>(new Set());

  /**
   * 알림 표시 함수
   */
  const showNotification = (warningType: string, title: string, message: string) => {
    // 중복 알림 방지
    if (notifiedRef.current.has(warningType)) {
      return;
    }
    notifiedRef.current.add(warningType);

    console.log(`🔔 토큰 알림: ${warningType} - ${message}`);

    // 브라우저 알림
    if (mergedConfig.useBrowserNotification) {
      showBrowserNotification(title, message);
    }

    // 토스트 알림 (전역 이벤트)
    const event = new CustomEvent('showToast', {
      detail: { 
        message, 
        type: warningType.includes('1min') ? 'error' : 'warning',
        duration: 5000,
        title 
      }
    });
    window.dispatchEvent(event);
  };

  /**
   * 토큰 상태 모니터링
   */
  useEffect(() => {
    if (!tokenInfo || tokenInfo.isExpired) return;

    const remainingMinutes = Math.floor(tokenInfo.remainingTime / (1000 * 60));

    // 정확한 분 단위에서만 알림
    if (remainingMinutes === 10 && mergedConfig.enable10MinWarning && 
        !notifiedRef.current.has('10min-warning')) {
      showNotification(
        '10min-warning',
        '세션 만료 경고',
        '세션이 10분 후 만료됩니다. 세션 연장을 권장합니다.'
      );
    }

    if (remainingMinutes === 5 && mergedConfig.enable5MinWarning && 
        !notifiedRef.current.has('5min-warning')) {
      showNotification(
        '5min-warning',
        '세션 만료 임박',
        '세션이 5분 후 만료됩니다. 지금 세션을 연장하세요!'
      );
    }

    if (remainingMinutes === 1 && mergedConfig.enable1MinWarning && 
        !notifiedRef.current.has('1min-warning')) {
      showNotification(
        '1min-warning',
        '긴급: 세션 만료 직전',
        '세션이 1분 후 만료됩니다! 즉시 세션을 연장하거나 작업을 저장하세요!'
      );
    }

  }, [tokenInfo?.remainingTime, mergedConfig]); // 남은 시간만 의존성으로 설정

  /**
   * 토큰 갱신 시 알림 상태 초기화
   */
  useEffect(() => {
    const handleTokenRefresh = () => {
      console.log('🔄 토큰 갱신으로 알림 상태 초기화');
      notifiedRef.current.clear();
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh);
    return () => window.removeEventListener('tokenRefreshed', handleTokenRefresh);
  }, []);

  /**
   * 브라우저 알림 권한 초기화 (조용한 방식)
   */
  useEffect(() => {
    if (mergedConfig.useBrowserNotification && Notification.permission === 'default') {
      // [advice from AI] 권한이 기본 상태일 때만 요청 (사용자가 이미 거부했다면 요청하지 않음)
      requestNotificationPermission().then(granted => {
        if (!granted && Notification.permission === 'denied') {
          console.info('ℹ️ 브라우저 알림이 비활성화되어 있습니다. 토스트 알림만 사용됩니다.');
        }
      });
    }
  }, [mergedConfig.useBrowserNotification]);

  /**
   * 알림 상태 수동 초기화
   */
  const resetNotifications = () => {
    notifiedRef.current.clear();
    console.log('🔄 토큰 알림 상태가 수동으로 초기화되었습니다.');
  };

  return {
    resetNotifications,
    notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  };
};

export default useSimpleTokenNotifications;
