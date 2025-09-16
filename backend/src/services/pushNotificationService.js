// [advice from AI] 푸시 알림 서비스
// 브라우저/모바일 푸시 알림 기능 구현

const webpush = require('web-push');
const { v4: uuidv4 } = require('uuid');

class PushNotificationService {
  constructor() {
    this.isInitialized = false;
    this.subscriptions = new Map(); // 사용자별 구독 정보 저장
    this.vapidKeys = null;
  }

  // [advice from AI] 푸시 알림 서비스 초기화
  async initialize(vapidSettings) {
    try {
      if (!vapidSettings || !vapidSettings.enabled) {
        throw new Error('푸시 알림이 비활성화되어 있습니다');
      }

      // [advice from AI] VAPID 키 설정
      if (vapidSettings.publicKey && vapidSettings.privateKey) {
        webpush.setVapidDetails(
          vapidSettings.subject || 'mailto:admin@timbel.com',
          vapidSettings.publicKey,
          vapidSettings.privateKey
        );
        this.vapidKeys = {
          publicKey: vapidSettings.publicKey,
          privateKey: vapidSettings.privateKey,
          subject: vapidSettings.subject || 'mailto:admin@timbel.com'
        };
      } else {
        // [advice from AI] VAPID 키 자동 생성
        const vapidKeys = webpush.generateVAPIDKeys();
        webpush.setVapidDetails(
          'mailto:admin@timbel.com',
          vapidKeys.publicKey,
          vapidKeys.privateKey
        );
        this.vapidKeys = {
          publicKey: vapidKeys.publicKey,
          privateKey: vapidKeys.privateKey,
          subject: 'mailto:admin@timbel.com'
        };
      }

      this.isInitialized = true;
      console.log('푸시 알림 서비스가 성공적으로 초기화되었습니다');
      
      return {
        success: true,
        message: '푸시 알림 서비스 초기화 완료',
        vapidKeys: this.vapidKeys
      };

    } catch (error) {
      console.error('푸시 알림 서비스 초기화 실패:', error);
      this.isInitialized = false;
      throw new Error(`푸시 알림 서비스 초기화 실패: ${error.message}`);
    }
  }

  // [advice from AI] 구독 등록
  async subscribeUser(userId, subscription) {
    try {
      if (!this.isInitialized) {
        throw new Error('푸시 알림 서비스가 초기화되지 않았습니다');
      }

      // [advice from AI] 구독 정보 검증
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        throw new Error('유효하지 않은 구독 정보입니다');
      }

      // [advice from AI] 사용자별 구독 정보 저장
      if (!this.subscriptions.has(userId)) {
        this.subscriptions.set(userId, []);
      }

      const userSubscriptions = this.subscriptions.get(userId);
      
      // [advice from AI] 중복 구독 확인
      const existingSubscription = userSubscriptions.find(sub => 
        sub.endpoint === subscription.endpoint
      );

      if (existingSubscription) {
        // [advice from AI] 기존 구독 업데이트
        Object.assign(existingSubscription, subscription);
      } else {
        // [advice from AI] 새 구독 추가
        userSubscriptions.push({
          ...subscription,
          id: uuidv4(),
          subscribedAt: new Date().toISOString()
        });
      }

      console.log(`사용자 ${userId}의 푸시 알림 구독이 등록되었습니다`);
      
      return {
        success: true,
        message: '푸시 알림 구독이 등록되었습니다',
        subscriptionId: existingSubscription ? existingSubscription.id : userSubscriptions[userSubscriptions.length - 1].id
      };

    } catch (error) {
      console.error('구독 등록 실패:', error);
      throw new Error(`구독 등록 실패: ${error.message}`);
    }
  }

  // [advice from AI] 구독 해제
  async unsubscribeUser(userId, subscriptionId) {
    try {
      if (!this.subscriptions.has(userId)) {
        throw new Error('사용자의 구독 정보를 찾을 수 없습니다');
      }

      const userSubscriptions = this.subscriptions.get(userId);
      const subscriptionIndex = userSubscriptions.findIndex(sub => sub.id === subscriptionId);

      if (subscriptionIndex === -1) {
        throw new Error('구독 정보를 찾을 수 없습니다');
      }

      userSubscriptions.splice(subscriptionIndex, 1);

      // [advice from AI] 구독이 없으면 사용자 구독 맵에서 제거
      if (userSubscriptions.length === 0) {
        this.subscriptions.delete(userId);
      }

      console.log(`사용자 ${userId}의 푸시 알림 구독이 해제되었습니다`);
      
      return {
        success: true,
        message: '푸시 알림 구독이 해제되었습니다'
      };

    } catch (error) {
      console.error('구독 해제 실패:', error);
      throw new Error(`구독 해제 실패: ${error.message}`);
    }
  }

  // [advice from AI] 푸시 알림 전송
  async sendNotification(userId, notificationData) {
    try {
      if (!this.isInitialized) {
        throw new Error('푸시 알림 서비스가 초기화되지 않았습니다');
      }

      if (!this.subscriptions.has(userId)) {
        throw new Error('사용자의 구독 정보를 찾을 수 없습니다');
      }

      const userSubscriptions = this.subscriptions.get(userId);
      const results = [];

      // [advice from AI] 사용자의 모든 구독에 알림 전송
      for (const subscription of userSubscriptions) {
        try {
          const payload = JSON.stringify({
            title: notificationData.title || 'Timbel 알림',
            body: notificationData.body || '새로운 알림이 있습니다',
            icon: notificationData.icon || '/favicon.ico',
            badge: notificationData.badge || '/badge.png',
            url: notificationData.url || '/',
            data: notificationData.data || {},
            actions: notificationData.actions || [],
            tag: notificationData.tag || 'timbel-notification',
            requireInteraction: notificationData.requireInteraction || false,
            silent: notificationData.silent || false,
            timestamp: Date.now()
          });

          const result = await webpush.sendNotification(subscription, payload);
          results.push({
            subscriptionId: subscription.id,
            success: true,
            statusCode: result.statusCode
          });

        } catch (subscriptionError) {
          console.error(`구독 ${subscription.id}에 알림 전송 실패:`, subscriptionError);
          
          // [advice from AI] 실패한 구독 제거
          if (subscriptionError.statusCode === 410) {
            const index = userSubscriptions.findIndex(sub => sub.id === subscription.id);
            if (index !== -1) {
              userSubscriptions.splice(index, 1);
            }
          }

          results.push({
            subscriptionId: subscription.id,
            success: false,
            error: subscriptionError.message
          });
        }
      }

      // [advice from AI] 구독이 없으면 사용자 구독 맵에서 제거
      if (userSubscriptions.length === 0) {
        this.subscriptions.delete(userId);
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`사용자 ${userId}에게 푸시 알림 전송 완료: 성공 ${successCount}개, 실패 ${failureCount}개`);

      return {
        success: successCount > 0,
        message: `푸시 알림 전송 완료: 성공 ${successCount}개, 실패 ${failureCount}개`,
        results: results
      };

    } catch (error) {
      console.error('푸시 알림 전송 실패:', error);
      throw new Error(`푸시 알림 전송 실패: ${error.message}`);
    }
  }

  // [advice from AI] 브로드캐스트 알림 전송
  async broadcastNotification(notificationData, userIds = null) {
    try {
      if (!this.isInitialized) {
        throw new Error('푸시 알림 서비스가 초기화되지 않았습니다');
      }

      const targetUsers = userIds || Array.from(this.subscriptions.keys());
      const results = [];

      // [advice from AI] 모든 대상 사용자에게 알림 전송
      for (const userId of targetUsers) {
        try {
          const result = await this.sendNotification(userId, notificationData);
          results.push({
            userId: userId,
            success: result.success,
            message: result.message,
            results: result.results
          });
        } catch (error) {
          results.push({
            userId: userId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      console.log(`브로드캐스트 푸시 알림 전송 완료: 성공 ${successCount}개, 실패 ${failureCount}개`);

      return {
        success: successCount > 0,
        message: `브로드캐스트 푸시 알림 전송 완료: 성공 ${successCount}개, 실패 ${failureCount}개`,
        results: results
      };

    } catch (error) {
      console.error('브로드캐스트 푸시 알림 전송 실패:', error);
      throw new Error(`브로드캐스트 푸시 알림 전송 실패: ${error.message}`);
    }
  }

  // [advice from AI] 시스템 알림 전송
  async sendSystemNotification(notificationData) {
    try {
      const systemNotification = {
        title: notificationData.title || '시스템 알림',
        body: notificationData.body || '시스템에서 알림이 발생했습니다',
        icon: '/system-icon.png',
        badge: '/system-badge.png',
        url: notificationData.url || '/admin/notifications',
        data: {
          type: 'system',
          priority: notificationData.priority || 'normal',
          ...notificationData.data
        },
        actions: [
          {
            action: 'view',
            title: '확인',
            icon: '/check-icon.png'
          },
          {
            action: 'dismiss',
            title: '닫기',
            icon: '/close-icon.png'
          }
        ],
        tag: 'system-notification',
        requireInteraction: notificationData.requireInteraction || false,
        silent: false
      };

      return await this.broadcastNotification(systemNotification);

    } catch (error) {
      console.error('시스템 알림 전송 실패:', error);
      throw new Error(`시스템 알림 전송 실패: ${error.message}`);
    }
  }

  // [advice from AI] 알림 템플릿 기반 전송
  async sendTemplateNotification(templateName, userId, variables = {}) {
    try {
      const templates = {
        'user_login': {
          title: '로그인 알림',
          body: `안녕하세요 ${variables.username || '사용자'}님, 로그인하셨습니다.`,
          icon: '/login-icon.png',
          url: '/dashboard',
          data: { type: 'login', userId: userId }
        },
        'system_error': {
          title: '시스템 오류 발생',
          body: `시스템에서 오류가 발생했습니다: ${variables.error_message || '알 수 없는 오류'}`,
          icon: '/error-icon.png',
          url: '/admin/logs',
          data: { type: 'error', severity: variables.severity || 'high' }
        },
        'backup_completed': {
          title: '백업 완료',
          body: `백업이 성공적으로 완료되었습니다: ${variables.backup_name || '백업 파일'}`,
          icon: '/backup-icon.png',
          url: '/admin/backups',
          data: { type: 'backup', backupId: variables.backup_id }
        },
        'alert_notification': {
          title: variables.alert_name || '알림',
          body: variables.message || '새로운 알림이 있습니다',
          icon: '/alert-icon.png',
          url: '/admin/alerts',
          data: { 
            type: 'alert', 
            severity: variables.severity || 'normal',
            alertId: variables.alert_id
          }
        }
      };

      const template = templates[templateName];
      if (!template) {
        throw new Error(`알 수 없는 템플릿입니다: ${templateName}`);
      }

      // [advice from AI] 템플릿 변수 치환
      const processedTemplate = JSON.parse(JSON.stringify(template).replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      }));

      return await this.sendNotification(userId, processedTemplate);

    } catch (error) {
      console.error('템플릿 알림 전송 실패:', error);
      throw new Error(`템플릿 알림 전송 실패: ${error.message}`);
    }
  }

  // [advice from AI] 구독 정보 조회
  getUserSubscriptions(userId) {
    return this.subscriptions.get(userId) || [];
  }

  // [advice from AI] 전체 구독 통계
  getSubscriptionStats() {
    const totalUsers = this.subscriptions.size;
    const totalSubscriptions = Array.from(this.subscriptions.values())
      .reduce((total, subs) => total + subs.length, 0);

    return {
      totalUsers,
      totalSubscriptions,
      averageSubscriptionsPerUser: totalUsers > 0 ? totalSubscriptions / totalUsers : 0
    };
  }

  // [advice from AI] 서비스 상태 확인
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasVapidKeys: !!this.vapidKeys,
      vapidPublicKey: this.vapidKeys?.publicKey,
      subscriptionStats: this.getSubscriptionStats(),
      timestamp: new Date().toISOString()
    };
  }

  // [advice from AI] 서비스 종료
  async close() {
    try {
      this.subscriptions.clear();
      this.isInitialized = false;
      this.vapidKeys = null;
      console.log('푸시 알림 서비스가 종료되었습니다');
    } catch (error) {
      console.error('푸시 알림 서비스 종료 중 오류:', error);
    }
  }
}

module.exports = PushNotificationService;
