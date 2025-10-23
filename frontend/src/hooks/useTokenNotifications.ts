// [advice from AI] 프로덕션 레벨 토큰 만료 알림 시스템
// 토큰 만료 임박 시 사용자에게 알림을 제공하는 전용 훅

import { useEffect, useRef, useCallback } from 'react';
import { useTokenTimer, TokenTimeInfo } from './useTokenTimer';

export interface NotificationConfig {
  /** 30분 전 알림 활성화 여부 */
  enable30MinWarning?: boolean;
  /** 10분 전 알림 활성화 여부 */
  enable10MinWarning?: boolean;
  /** 5분 전 알림 활성화 여부 */
  enable5MinWarning?: boolean;
  /** 1분 전 알림 활성화 여부 */
  enable1MinWarning?: boolean;
  /** 브라우저 알림 사용 여부 */
  useBrowserNotification?: boolean;
  /** 토스트 알림 사용 여부 */
  useToastNotification?: boolean;
  /** 사운드 알림 사용 여부 */
  useSoundNotification?: boolean;
  /** 커스텀 알림 핸들러 */
  customNotificationHandler?: (timeInfo: TokenTimeInfo, warningType: string) => void;
}

const DEFAULT_CONFIG: Required<NotificationConfig> = {
  enable30MinWarning: true,
  enable10MinWarning: true,
  enable5MinWarning: true,
  enable1MinWarning: true,
  useBrowserNotification: true,
  useToastNotification: true,
  useSoundNotification: false,
  customNotificationHandler: () => {}
};

/**
 * 브라우저 알림 권한 요청
 */
const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('이 브라우저는 알림을 지원하지 않습니다.');
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
const showBrowserNotification = (title: string, options: NotificationOptions = {}) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'token-warning',
      renotify: true,
      requireInteraction: true,
      ...options
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
 * 토스트 알림 표시 (전역 이벤트 발생)
 */
const showToastNotification = (
  message: string, 
  type: 'info' | 'warning' | 'error' | 'success' = 'warning'
) => {
  const event = new CustomEvent('showToast', {
    detail: { message, type, duration: 5000 }
  });
  window.dispatchEvent(event);
};

/**
 * 사운드 알림 재생
 */
const playSoundNotification = (urgency: 'low' | 'medium' | 'high' = 'medium') => {
  try {
    // Web Audio API를 사용한 간단한 비프음 생성
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // 긴급도에 따른 주파수 설정
    const frequency = urgency === 'high' ? 800 : urgency === 'medium' ? 600 : 400;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = 'sine';

    // 볼륨 설정
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    // 재생
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('사운드 알림 재생 실패:', error);
  }
};

/**
 * 토큰 만료 알림 훅
 */
export const useTokenNotifications = (config: NotificationConfig = {}) => {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const { tokenInfo } = useTokenTimer();
  const notifiedWarningsRef = useRef<Set<string>>(new Set());
  const lastStatusRef = useRef<TokenTimeInfo['timeStatus'] | null>(null);

  /**
   * 알림 표시 함수
   */
  const showNotification = useCallback((
    warningType: string,
    title: string,
    message: string,
    urgency: 'low' | 'medium' | 'high' = 'medium'
  ) => {
    // 중복 알림 방지
    if (notifiedWarningsRef.current.has(warningType)) {
      return;
    }
    notifiedWarningsRef.current.add(warningType);

    console.log(`🔔 토큰 알림: ${warningType} - ${message}`);

    // 브라우저 알림
    if (mergedConfig.useBrowserNotification) {
      showBrowserNotification(title, {
        body: message,
        icon: urgency === 'high' ? '/warning-icon.png' : '/info-icon.png'
      });
    }

    // 토스트 알림
    if (mergedConfig.useToastNotification) {
      const toastType = urgency === 'high' ? 'error' : urgency === 'medium' ? 'warning' : 'info';
      showToastNotification(message, toastType);
    }

    // 사운드 알림
    if (mergedConfig.useSoundNotification) {
      playSoundNotification(urgency);
    }

    // 커스텀 알림 핸들러
    if (tokenInfo && mergedConfig.customNotificationHandler) {
      mergedConfig.customNotificationHandler(tokenInfo, warningType);
    }

  }, [mergedConfig, tokenInfo]);

  /**
   * 토큰 상태 변화 감지 및 알림 처리
   */
  useEffect(() => {
    if (!tokenInfo) return;

    const remainingMinutes = tokenInfo.remainingTime / (1000 * 60);
    const currentStatus = tokenInfo.timeStatus;

    // 상태가 변경되었을 때만 알림 체크
    if (lastStatusRef.current !== currentStatus) {
      lastStatusRef.current = currentStatus;

      // 30분 전 알림
      if (mergedConfig.enable30MinWarning && 
          remainingMinutes <= 30 && remainingMinutes > 25 &&
          currentStatus === 'warning') {
        showNotification(
          '30min-warning',
          '세션 만료 알림',
          '세션이 30분 후 만료됩니다. 작업을 저장해 주세요.',
          'low'
        );
      }

      // 10분 전 알림
      if (mergedConfig.enable10MinWarning && 
          remainingMinutes <= 10 && remainingMinutes > 8 &&
          currentStatus === 'danger') {
        showNotification(
          '10min-warning',
          '세션 만료 경고',
          '세션이 10분 후 만료됩니다. 세션 연장을 권장합니다.',
          'medium'
        );
      }

      // 5분 전 알림
      if (mergedConfig.enable5MinWarning && 
          remainingMinutes <= 5 && remainingMinutes > 3 &&
          currentStatus === 'critical') {
        showNotification(
          '5min-warning',
          '세션 만료 임박',
          '세션이 5분 후 만료됩니다. 지금 세션을 연장하세요!',
          'high'
        );
      }

      // 1분 전 알림
      if (mergedConfig.enable1MinWarning && 
          remainingMinutes <= 1 && remainingMinutes > 0.5 &&
          currentStatus === 'critical') {
        showNotification(
          '1min-warning',
          '긴급: 세션 만료 직전',
          '세션이 1분 후 만료됩니다! 즉시 세션을 연장하거나 작업을 저장하세요!',
          'high'
        );
      }
    }

    // 정확한 분 단위 알림 (분이 바뀔 때마다)
    const exactMinutes = Math.floor(remainingMinutes);
    
    // 정확히 30분, 10분, 5분, 1분일 때 알림
    if (exactMinutes === 30 && mergedConfig.enable30MinWarning && 
        !notifiedWarningsRef.current.has('exact-30min')) {
      showNotification(
        'exact-30min',
        '세션 만료 알림',
        '정확히 30분 후 세션이 만료됩니다.',
        'low'
      );
    }

    if (exactMinutes === 10 && mergedConfig.enable10MinWarning && 
        !notifiedWarningsRef.current.has('exact-10min')) {
      showNotification(
        'exact-10min',
        '세션 만료 경고',
        '정확히 10분 후 세션이 만료됩니다.',
        'medium'
      );
    }

    if (exactMinutes === 5 && mergedConfig.enable5MinWarning && 
        !notifiedWarningsRef.current.has('exact-5min')) {
      showNotification(
        'exact-5min',
        '세션 만료 임박',
        '정확히 5분 후 세션이 만료됩니다!',
        'high'
      );
    }

    if (exactMinutes === 1 && mergedConfig.enable1MinWarning && 
        !notifiedWarningsRef.current.has('exact-1min')) {
      showNotification(
        'exact-1min',
        '긴급: 세션 만료 직전',
        '정확히 1분 후 세션이 만료됩니다!',
        'high'
      );
    }

  }, [tokenInfo, mergedConfig, showNotification]);

  /**
   * 토큰이 갱신되면 알림 상태 초기화
   */
  useEffect(() => {
    const handleTokenRefresh = () => {
      console.log('🔄 토큰 갱신으로 알림 상태 초기화');
      notifiedWarningsRef.current.clear();
      lastStatusRef.current = null;
    };

    window.addEventListener('tokenRefreshed', handleTokenRefresh);
    return () => window.removeEventListener('tokenRefreshed', handleTokenRefresh);
  }, []);

  /**
   * 브라우저 알림 권한 초기화
   */
  useEffect(() => {
    if (mergedConfig.useBrowserNotification) {
      requestNotificationPermission().then(granted => {
        if (granted) {
          console.log('✅ 브라우저 알림 권한이 허용되었습니다.');
        } else {
          console.warn('⚠️ 브라우저 알림 권한이 거부되었습니다.');
        }
      });
    }
  }, [mergedConfig.useBrowserNotification]);

  /**
   * 알림 상태 수동 초기화
   */
  const resetNotifications = useCallback(() => {
    notifiedWarningsRef.current.clear();
    lastStatusRef.current = null;
    console.log('🔄 토큰 알림 상태가 수동으로 초기화되었습니다.');
  }, []);

  /**
   * 테스트용 알림 표시
   */
  const testNotification = useCallback((type: 'info' | 'warning' | 'error' = 'info') => {
    showNotification(
      'test',
      '테스트 알림',
      '이것은 토큰 알림 시스템의 테스트 메시지입니다.',
      type === 'error' ? 'high' : type === 'warning' ? 'medium' : 'low'
    );
  }, [showNotification]);

  return {
    resetNotifications,
    testNotification,
    notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  };
};

export default useTokenNotifications;
