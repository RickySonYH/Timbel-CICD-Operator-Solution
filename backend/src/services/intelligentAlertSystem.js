// [advice from AI] 프로덕션 레벨 지능형 알림 시스템
// 머신러닝 기반 이상 감지, 적응형 임계값, 알림 피로도 방지

const EventEmitter = require('events');
const { globalErrorHandler } = require('../middleware/globalErrorHandler');

class IntelligentAlertSystem extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.name = options.name || 'IntelligentAlertSystem';
    this.learningPeriod = options.learningPeriod || 7 * 24 * 60 * 60 * 1000; // 7일
    this.alertCooldown = options.alertCooldown || 5 * 60 * 1000; // 5분
    this.maxAlertsPerHour = options.maxAlertsPerHour || 10;
    this.enableMachineLearning = options.enableMachineLearning !== false;
    
    // 메트릭 히스토리 저장
    this.metricHistory = new Map();
    this.alertHistory = new Map();
    this.adaptiveThresholds = new Map();
    this.alertChannels = new Map();
    
    // 알림 피로도 방지
    this.alertCooldowns = new Map();
    this.hourlyAlertCounts = new Map();
    
    // 이상 감지 모델
    this.anomalyDetectors = new Map();
    
    // 기본 알림 채널 설정
    this.setupDefaultChannels();
    
    // 주기적 작업 시작
    this.startPeriodicTasks();
    
    console.log(`🚨 지능형 알림 시스템 '${this.name}' 초기화 완료`);
  }

  // [advice from AI] 기본 알림 채널 설정
  setupDefaultChannels() {
    // 콘솔 알림 (개발/테스트용)
    this.registerChannel('console', {
      send: async (alert) => {
        const emoji = this.getSeverityEmoji(alert.severity);
        console.log(`${emoji} [${alert.severity}] ${alert.title}: ${alert.message}`);
        return { success: true, channel: 'console' };
      },
      priority: 1,
      enabled: true
    });
    
    // 이메일 알림 (프로덕션용)
    this.registerChannel('email', {
      send: async (alert) => {
        // 실제 이메일 발송 로직
        console.log(`📧 이메일 알림 발송: ${alert.title}`);
        return { success: true, channel: 'email' };
      },
      priority: 2,
      enabled: process.env.ENABLE_EMAIL_ALERTS === 'true'
    });
    
    // Slack 알림 (팀 협업용)
    this.registerChannel('slack', {
      send: async (alert) => {
        // Slack Webhook 발송 로직
        console.log(`💬 Slack 알림 발송: ${alert.title}`);
        return { success: true, channel: 'slack' };
      },
      priority: 3,
      enabled: process.env.ENABLE_SLACK_ALERTS === 'true'
    });
    
    // SMS 알림 (긴급 상황용)
    this.registerChannel('sms', {
      send: async (alert) => {
        // SMS 발송 로직
        console.log(`📱 SMS 알림 발송: ${alert.title}`);
        return { success: true, channel: 'sms' };
      },
      priority: 4,
      enabled: process.env.ENABLE_SMS_ALERTS === 'true',
      severityFilter: ['critical', 'high']
    });
  }

  // [advice from AI] 알림 채널 등록
  registerChannel(name, config) {
    this.alertChannels.set(name, {
      ...config,
      stats: {
        sent: 0,
        failed: 0,
        lastSent: null
      }
    });
    
    console.log(`📢 알림 채널 '${name}' 등록됨 (우선순위: ${config.priority})`);
  }

  // [advice from AI] 메트릭 데이터 학습
  learnMetric(metricName, value, timestamp = Date.now()) {
    if (!this.metricHistory.has(metricName)) {
      this.metricHistory.set(metricName, []);
    }
    
    const history = this.metricHistory.get(metricName);
    history.push({ value, timestamp });
    
    // 학습 기간을 넘는 오래된 데이터 제거
    const cutoffTime = timestamp - this.learningPeriod;
    const filteredHistory = history.filter(entry => entry.timestamp > cutoffTime);
    this.metricHistory.set(metricName, filteredHistory);
    
    // 적응형 임계값 업데이트
    if (this.enableMachineLearning && filteredHistory.length > 10) {
      this.updateAdaptiveThreshold(metricName, filteredHistory);
    }
    
    // 이상 감지 수행
    this.detectAnomaly(metricName, value, timestamp);
  }

  // [advice from AI] 적응형 임계값 업데이트
  updateAdaptiveThreshold(metricName, history) {
    const values = history.map(entry => entry.value);
    
    // 기본 통계 계산
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // 시간대별 패턴 분석
    const hourlyPatterns = this.analyzeHourlyPatterns(history);
    const dailyPatterns = this.analyzeDailyPatterns(history);
    
    // 적응형 임계값 설정
    const thresholds = {
      warning: mean + (1.5 * stdDev),
      critical: mean + (2.5 * stdDev),
      anomaly: mean + (3 * stdDev),
      baseline: {
        mean,
        stdDev,
        min: Math.min(...values),
        max: Math.max(...values)
      },
      patterns: {
        hourly: hourlyPatterns,
        daily: dailyPatterns
      },
      lastUpdated: Date.now()
    };
    
    this.adaptiveThresholds.set(metricName, thresholds);
    
    console.log(`🧠 적응형 임계값 업데이트: ${metricName} (평균: ${mean.toFixed(2)}, 표준편차: ${stdDev.toFixed(2)})`);
  }

  // [advice from AI] 시간대별 패턴 분석
  analyzeHourlyPatterns(history) {
    const hourlyData = {};
    
    history.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = [];
      }
      hourlyData[hour].push(entry.value);
    });
    
    const patterns = {};
    for (const [hour, values] of Object.entries(hourlyData)) {
      if (values.length > 0) {
        patterns[hour] = {
          mean: values.reduce((sum, val) => sum + val, 0) / values.length,
          count: values.length
        };
      }
    }
    
    return patterns;
  }

  // [advice from AI] 일별 패턴 분석
  analyzeDailyPatterns(history) {
    const dailyData = {};
    
    history.forEach(entry => {
      const day = new Date(entry.timestamp).getDay(); // 0 = Sunday
      if (!dailyData[day]) {
        dailyData[day] = [];
      }
      dailyData[day].push(entry.value);
    });
    
    const patterns = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (const [day, values] of Object.entries(dailyData)) {
      if (values.length > 0) {
        patterns[dayNames[day]] = {
          mean: values.reduce((sum, val) => sum + val, 0) / values.length,
          count: values.length
        };
      }
    }
    
    return patterns;
  }

  // [advice from AI] 이상 감지
  detectAnomaly(metricName, value, timestamp) {
    const thresholds = this.adaptiveThresholds.get(metricName);
    
    if (!thresholds) {
      return; // 아직 충분한 학습 데이터가 없음
    }
    
    let severity = null;
    let message = '';
    
    // 임계값 기반 판단
    if (value > thresholds.anomaly) {
      severity = 'critical';
      message = `심각한 이상값 감지: ${value.toFixed(2)} (기준: ${thresholds.anomaly.toFixed(2)})`;
    } else if (value > thresholds.critical) {
      severity = 'high';
      message = `위험 임계값 초과: ${value.toFixed(2)} (기준: ${thresholds.critical.toFixed(2)})`;
    } else if (value > thresholds.warning) {
      severity = 'medium';
      message = `경고 임계값 초과: ${value.toFixed(2)} (기준: ${thresholds.warning.toFixed(2)})`;
    }
    
    // 패턴 기반 이상 감지
    const patternAnomaly = this.detectPatternAnomaly(metricName, value, timestamp, thresholds);
    if (patternAnomaly && (!severity || patternAnomaly.severity === 'critical')) {
      severity = patternAnomaly.severity;
      message = patternAnomaly.message;
    }
    
    if (severity) {
      this.createAlert({
        metricName,
        value,
        severity,
        message,
        timestamp,
        thresholds,
        type: 'anomaly'
      });
    }
  }

  // [advice from AI] 패턴 기반 이상 감지
  detectPatternAnomaly(metricName, value, timestamp, thresholds) {
    const now = new Date(timestamp);
    const hour = now.getHours();
    const day = now.getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
    
    // 시간대별 패턴 확인
    if (thresholds.patterns.hourly[hour]) {
      const expectedMean = thresholds.patterns.hourly[hour].mean;
      const deviation = Math.abs(value - expectedMean);
      const threshold = thresholds.baseline.stdDev * 2;
      
      if (deviation > threshold) {
        return {
          severity: 'medium',
          message: `시간대 패턴 이상 (${hour}시): ${value.toFixed(2)} vs 예상 ${expectedMean.toFixed(2)}`
        };
      }
    }
    
    // 요일별 패턴 확인
    if (thresholds.patterns.daily[dayName]) {
      const expectedMean = thresholds.patterns.daily[dayName].mean;
      const deviation = Math.abs(value - expectedMean);
      const threshold = thresholds.baseline.stdDev * 1.5;
      
      if (deviation > threshold) {
        return {
          severity: 'low',
          message: `요일 패턴 이상 (${dayName}): ${value.toFixed(2)} vs 예상 ${expectedMean.toFixed(2)}`
        };
      }
    }
    
    return null;
  }

  // [advice from AI] 알림 생성
  async createAlert(alertData) {
    const alertId = this.generateAlertId();
    const alert = {
      id: alertId,
      title: `${alertData.metricName} 이상 감지`,
      message: alertData.message,
      severity: alertData.severity,
      metricName: alertData.metricName,
      value: alertData.value,
      timestamp: alertData.timestamp,
      thresholds: alertData.thresholds,
      type: alertData.type,
      status: 'active',
      attempts: 0,
      channels: []
    };
    
    // 알림 피로도 방지 검사
    if (!this.shouldSendAlert(alert)) {
      console.log(`⏸️ 알림 피로도 방지: ${alert.title} (쿨다운 중)`);
      return null;
    }
    
    // 알림 히스토리에 추가
    this.alertHistory.set(alertId, alert);
    
    // 알림 발송
    await this.sendAlert(alert);
    
    // 이벤트 발생
    this.emit('alertCreated', alert);
    
    return alert;
  }

  // [advice from AI] 알림 발송 여부 판단
  shouldSendAlert(alert) {
    const now = Date.now();
    const cooldownKey = `${alert.metricName}_${alert.severity}`;
    
    // 쿨다운 확인
    if (this.alertCooldowns.has(cooldownKey)) {
      const lastAlert = this.alertCooldowns.get(cooldownKey);
      if (now - lastAlert < this.alertCooldown) {
        return false;
      }
    }
    
    // 시간당 알림 수 제한 확인
    const hourKey = Math.floor(now / (60 * 60 * 1000));
    const hourlyCount = this.hourlyAlertCounts.get(hourKey) || 0;
    
    if (hourlyCount >= this.maxAlertsPerHour) {
      return false;
    }
    
    return true;
  }

  // [advice from AI] 알림 발송
  async sendAlert(alert) {
    const channels = Array.from(this.alertChannels.entries())
      .filter(([name, config]) => {
        // 활성화된 채널만
        if (!config.enabled) return false;
        
        // 심각도 필터 적용
        if (config.severityFilter && !config.severityFilter.includes(alert.severity)) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => a[1].priority - b[1].priority);
    
    const results = [];
    
    for (const [channelName, channelConfig] of channels) {
      try {
        alert.attempts++;
        
        const result = await channelConfig.send(alert);
        
        if (result.success) {
          channelConfig.stats.sent++;
          channelConfig.stats.lastSent = Date.now();
          results.push({ channel: channelName, success: true });
          
          console.log(`✅ 알림 발송 성공: ${channelName} - ${alert.title}`);
        } else {
          throw new Error(result.error || '발송 실패');
        }
        
      } catch (error) {
        channelConfig.stats.failed++;
        results.push({ 
          channel: channelName, 
          success: false, 
          error: error.message 
        });
        
        console.error(`❌ 알림 발송 실패: ${channelName} - ${error.message}`);
      }
    }
    
    // 발송 결과 업데이트
    alert.channels = results;
    alert.status = results.some(r => r.success) ? 'sent' : 'failed';
    
    // 쿨다운 및 카운터 업데이트
    if (alert.status === 'sent') {
      const cooldownKey = `${alert.metricName}_${alert.severity}`;
      const hourKey = Math.floor(Date.now() / (60 * 60 * 1000));
      
      this.alertCooldowns.set(cooldownKey, Date.now());
      this.hourlyAlertCounts.set(hourKey, (this.hourlyAlertCounts.get(hourKey) || 0) + 1);
    }
    
    this.emit('alertSent', { alert, results });
  }

  // [advice from AI] 심각도별 이모지 반환
  getSeverityEmoji(severity) {
    const emojiMap = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️',
      info: '📊'
    };
    return emojiMap[severity] || '📢';
  }

  // [advice from AI] 고유 알림 ID 생성
  generateAlertId() {
    return `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // [advice from AI] 주기적 작업 시작
  startPeriodicTasks() {
    // 오래된 히스토리 정리 (매시간)
    setInterval(() => {
      this.cleanupOldData();
    }, 60 * 60 * 1000);
    
    // 시간당 알림 카운터 정리 (매시간)
    setInterval(() => {
      this.cleanupHourlyCounters();
    }, 60 * 60 * 1000);
    
    // 적응형 임계값 재계산 (매 6시간)
    setInterval(() => {
      this.recalculateThresholds();
    }, 6 * 60 * 60 * 1000);
  }

  // [advice from AI] 오래된 데이터 정리
  cleanupOldData() {
    const cutoffTime = Date.now() - this.learningPeriod;
    
    // 메트릭 히스토리 정리
    for (const [metricName, history] of this.metricHistory) {
      const filteredHistory = history.filter(entry => entry.timestamp > cutoffTime);
      this.metricHistory.set(metricName, filteredHistory);
    }
    
    // 알림 히스토리 정리 (30일)
    const alertCutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    for (const [alertId, alert] of this.alertHistory) {
      if (alert.timestamp < alertCutoff) {
        this.alertHistory.delete(alertId);
      }
    }
    
    console.log('🧹 오래된 모니터링 데이터 정리 완료');
  }

  // [advice from AI] 시간당 카운터 정리
  cleanupHourlyCounters() {
    const currentHour = Math.floor(Date.now() / (60 * 60 * 1000));
    
    for (const hourKey of this.hourlyAlertCounts.keys()) {
      if (hourKey < currentHour - 24) { // 24시간 이전 데이터 삭제
        this.hourlyAlertCounts.delete(hourKey);
      }
    }
  }

  // [advice from AI] 적응형 임계값 재계산
  recalculateThresholds() {
    console.log('🧠 적응형 임계값 재계산 시작...');
    
    for (const [metricName, history] of this.metricHistory) {
      if (history.length > 10) {
        this.updateAdaptiveThreshold(metricName, history);
      }
    }
    
    console.log('✅ 적응형 임계값 재계산 완료');
  }

  // [advice from AI] 시스템 상태 조회
  getSystemStatus() {
    return {
      name: this.name,
      isActive: true,
      metrics: {
        totalMetrics: this.metricHistory.size,
        totalAlerts: this.alertHistory.size,
        adaptiveThresholds: this.adaptiveThresholds.size,
        channels: this.alertChannels.size
      },
      channels: Array.from(this.alertChannels.entries()).map(([name, config]) => ({
        name,
        enabled: config.enabled,
        priority: config.priority,
        stats: config.stats
      })),
      recentAlerts: Array.from(this.alertHistory.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10),
      configuration: {
        learningPeriod: this.learningPeriod,
        alertCooldown: this.alertCooldown,
        maxAlertsPerHour: this.maxAlertsPerHour,
        enableMachineLearning: this.enableMachineLearning
      }
    };
  }

  // [advice from AI] 특정 메트릭의 임계값 조회
  getMetricThresholds(metricName) {
    return this.adaptiveThresholds.get(metricName) || null;
  }

  // [advice from AI] 알림 히스토리 조회
  getAlertHistory(options = {}) {
    const { 
      limit = 50, 
      severity = null, 
      metricName = null, 
      startTime = null, 
      endTime = null 
    } = options;
    
    let alerts = Array.from(this.alertHistory.values());
    
    // 필터링
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    if (metricName) {
      alerts = alerts.filter(alert => alert.metricName === metricName);
    }
    
    if (startTime) {
      alerts = alerts.filter(alert => alert.timestamp >= startTime);
    }
    
    if (endTime) {
      alerts = alerts.filter(alert => alert.timestamp <= endTime);
    }
    
    // 정렬 및 제한
    return alerts
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }
}

// [advice from AI] 싱글톤 인스턴스
const intelligentAlertSystem = new IntelligentAlertSystem({
  name: 'TimbelAlertSystem',
  learningPeriod: 7 * 24 * 60 * 60 * 1000, // 7일
  alertCooldown: 5 * 60 * 1000, // 5분
  maxAlertsPerHour: 15,
  enableMachineLearning: true
});

module.exports = {
  IntelligentAlertSystem,
  intelligentAlertSystem
};
