// [advice from AI] 실시간 모니터링 서비스
// Prometheus/Grafana 연동, 알림 시스템, 성능 지표 수집

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const EmailService = require('./emailService');

class MonitoringService {
  constructor() {
    // [advice from AI] 모니터링 시스템 설정
    this.prometheusURL = process.env.PROMETHEUS_URL || 'http://localhost:9090';
    this.grafanaURL = process.env.GRAFANA_URL || 'http://localhost:3000';
    this.grafanaToken = process.env.GRAFANA_TOKEN || '';
    this.alertManagerURL = process.env.ALERTMANAGER_URL || 'http://localhost:9093';
    this.slackWebhook = process.env.SLACK_WEBHOOK_URL || '';
    
    // [advice from AI] 이메일 서비스 초기화
    this.emailService = new EmailService();
    
    // [advice from AI] 메트릭 수집 간격 (초)
    this.metricsInterval = parseInt(process.env.METRICS_INTERVAL || '30');
    
    // [advice from AI] 알림 레벨 정의
    this.alertLevels = {
      INFO: 'info',
      WARNING: 'warning',
      ERROR: 'error',
      CRITICAL: 'critical'
    };

    // [advice from AI] 기본 메트릭 정의
    this.defaultMetrics = [
      'cpu_usage',
      'memory_usage',
      'disk_usage',
      'network_io',
      'response_time',
      'error_rate',
      'request_count',
      'active_connections'
    ];

    // [advice from AI] 알림 임계값 설정
    this.thresholds = {
      cpu_usage: { warning: 70, critical: 90 },
      memory_usage: { warning: 80, critical: 95 },
      disk_usage: { warning: 85, critical: 95 },
      response_time: { warning: 1000, critical: 3000 },
      error_rate: { warning: 5, critical: 10 }
    };
  }

  // [advice from AI] 대시보드 생성
  async createDashboard(config) {
    try {
      const {
        dashboardName,
        tenantId,
        services = [],
        metrics = this.defaultMetrics,
        refreshInterval = '30s'
      } = config;

      if (!dashboardName || !tenantId) {
        throw new Error('대시보드 이름과 테넌트 ID는 필수입니다');
      }

      const dashboardId = uuidv4();
      const dashboard = {
        dashboard_id: dashboardId,
        dashboard_name: dashboardName,
        tenant_id: tenantId,
        services: services,
        metrics: metrics,
        refresh_interval: refreshInterval,
        panels: this.generateDashboardPanels(services, metrics),
        alerts: this.generateDefaultAlerts(services),
        status: 'active',
        created_at: new Date().toISOString()
      };

      console.log('대시보드 생성:', dashboard);

      // [advice from AI] Mock 응답 (실제 Grafana API 연동 시 교체)
      if (this.grafanaToken === '' || this.grafanaURL.includes('mock')) {
        return this.mockCreateDashboard(dashboard);
      }

      // [advice from AI] 실제 Grafana 대시보드 생성
      const result = await this.createGrafanaDashboard(dashboard);
      
      return {
        success: true,
        data: result,
        message: '대시보드가 성공적으로 생성되었습니다'
      };

    } catch (error) {
      console.error('대시보드 생성 오류:', error);
      throw new Error(`대시보드 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] 메트릭 수집
  async collectMetrics(tenantId, timeRange = '1h') {
    try {
      if (!tenantId) {
        throw new Error('테넌트 ID는 필수입니다');
      }

      // [advice from AI] Mock 응답
      if (this.prometheusURL.includes('mock')) {
        return this.mockCollectMetrics(tenantId, timeRange);
      }

      // [advice from AI] Prometheus 쿼리 실행
      const metrics = {};
      
      for (const metric of this.defaultMetrics) {
        const query = this.buildPrometheusQuery(metric, tenantId);
        const result = await this.queryPrometheus(query, timeRange);
        metrics[metric] = result;
      }

      return {
        success: true,
        data: {
          tenant_id: tenantId,
          time_range: timeRange,
          collected_at: new Date().toISOString(),
          metrics: metrics
        },
        message: '메트릭 수집 완료'
      };

    } catch (error) {
      console.error('메트릭 수집 오류:', error);
      throw new Error(`메트릭 수집 실패: ${error.message}`);
    }
  }

  // [advice from AI] 실시간 상태 조회
  async getRealTimeStatus(tenantId) {
    try {
      if (!tenantId) {
        throw new Error('테넌트 ID는 필수입니다');
      }

      // [advice from AI] Mock 응답
      if (this.prometheusURL.includes('mock')) {
        return this.mockGetRealTimeStatus(tenantId);
      }

      // [advice from AI] 실시간 메트릭 조회
      const currentMetrics = await this.collectMetrics(tenantId, '5m');
      const healthStatus = this.calculateHealthStatus(currentMetrics.data.metrics);
      const activeAlerts = await this.getActiveAlerts(tenantId);

      return {
        success: true,
        data: {
          tenant_id: tenantId,
          overall_health: healthStatus.overall,
          services_status: healthStatus.services,
          current_metrics: currentMetrics.data.metrics,
          active_alerts: activeAlerts,
          last_updated: new Date().toISOString()
        },
        message: '실시간 상태 조회 완료'
      };

    } catch (error) {
      console.error('실시간 상태 조회 오류:', error);
      throw new Error(`실시간 상태 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] 알림 생성
  async createAlert(alertConfig) {
    try {
      const {
        alertName,
        tenantId,
        metric,
        condition,
        threshold,
        duration = '5m',
        severity = 'warning',
        channels = ['slack']
      } = alertConfig;

      if (!alertName || !tenantId || !metric || !condition || threshold === undefined) {
        throw new Error('알림 이름, 테넌트 ID, 메트릭, 조건, 임계값은 필수입니다');
      }

      const alertId = uuidv4();
      const alert = {
        alert_id: alertId,
        alert_name: alertName,
        tenant_id: tenantId,
        metric: metric,
        condition: condition, // '>', '<', '>=', '<=', '=='
        threshold: threshold,
        duration: duration,
        severity: severity,
        channels: channels,
        status: 'active',
        created_at: new Date().toISOString(),
        last_triggered: null,
        trigger_count: 0
      };

      console.log('알림 생성:', alert);

      // [advice from AI] Mock 응답
      if (this.alertManagerURL.includes('mock')) {
        return this.mockCreateAlert(alert);
      }

      // [advice from AI] 실제 AlertManager 알림 규칙 생성
      const result = await this.createAlertManagerRule(alert);
      
      return {
        success: true,
        data: result,
        message: '알림이 성공적으로 생성되었습니다'
      };

    } catch (error) {
      console.error('알림 생성 오류:', error);
      throw new Error(`알림 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] 알림 전송
  async sendAlert(alertData) {
    try {
      const {
        alert_id,
        alert_name,
        tenant_id,
        severity,
        message,
        metric_value,
        threshold,
        channels = ['slack']
      } = alertData;

      const alertMessage = {
        alert_id,
        alert_name,
        tenant_id,
        severity,
        message: message || `${alert_name} 알림이 발생했습니다`,
        metric_value,
        threshold,
        timestamp: new Date().toISOString()
      };

      console.log('알림 전송:', alertMessage);

      const results = [];

      // [advice from AI] 채널별 알림 전송
      for (const channel of channels) {
        switch (channel) {
          case 'slack':
            if (this.slackWebhook) {
              const slackResult = await this.sendSlackAlert(alertMessage);
              results.push({ channel: 'slack', success: slackResult.success });
            }
            break;
          case 'email':
            const emailResult = await this.sendEmailAlert(alertMessage);
            results.push({ channel: 'email', success: emailResult.success });
            break;
          case 'webhook':
            const webhookResult = await this.sendWebhookAlert(alertMessage);
            results.push({ channel: 'webhook', success: webhookResult.success });
            break;
        }
      }

      return {
        success: true,
        data: {
          alert_message: alertMessage,
          delivery_results: results
        },
        message: '알림 전송 완료'
      };

    } catch (error) {
      console.error('알림 전송 오류:', error);
      throw new Error(`알림 전송 실패: ${error.message}`);
    }
  }

  // [advice from AI] Prometheus 쿼리 빌드
  buildPrometheusQuery(metric, tenantId) {
    const queries = {
      cpu_usage: `avg(cpu_usage{tenant_id="${tenantId}"}) * 100`,
      memory_usage: `avg(memory_usage{tenant_id="${tenantId}"}) * 100`,
      disk_usage: `avg(disk_usage{tenant_id="${tenantId}"}) * 100`,
      network_io: `rate(network_bytes_total{tenant_id="${tenantId}"}[5m])`,
      response_time: `avg(http_request_duration_seconds{tenant_id="${tenantId}"}) * 1000`,
      error_rate: `rate(http_requests_total{tenant_id="${tenantId}",status=~"5.."}[5m]) * 100`,
      request_count: `rate(http_requests_total{tenant_id="${tenantId}"}[5m])`,
      active_connections: `sum(active_connections{tenant_id="${tenantId}"})`
    };

    return queries[metric] || `avg(${metric}{tenant_id="${tenantId}"})`;
  }

  // [advice from AI] 대시보드 패널 생성
  generateDashboardPanels(services, metrics) {
    const panels = [];
    let panelId = 1;

    // [advice from AI] 전체 시스템 상태 패널
    panels.push({
      id: panelId++,
      title: '전체 시스템 상태',
      type: 'stat',
      metrics: ['cpu_usage', 'memory_usage', 'disk_usage'],
      gridPos: { x: 0, y: 0, w: 24, h: 4 }
    });

    // [advice from AI] 서비스별 메트릭 패널
    services.forEach((service, index) => {
      panels.push({
        id: panelId++,
        title: `${service.name} 성능 지표`,
        type: 'graph',
        metrics: ['response_time', 'request_count', 'error_rate'],
        service: service.name,
        gridPos: { x: (index % 2) * 12, y: 4 + Math.floor(index / 2) * 8, w: 12, h: 8 }
      });
    });

    // [advice from AI] 알림 상태 패널
    panels.push({
      id: panelId++,
      title: '활성 알림',
      type: 'table',
      metrics: ['alerts'],
      gridPos: { x: 0, y: 12, w: 24, h: 6 }
    });

    return panels;
  }

  // [advice from AI] 기본 알림 생성
  generateDefaultAlerts(services) {
    const alerts = [];

    // [advice from AI] 시스템 리소스 알림
    Object.entries(this.thresholds).forEach(([metric, thresholds]) => {
      alerts.push({
        name: `High ${metric.replace('_', ' ')}`,
        metric: metric,
        condition: '>=',
        threshold: thresholds.warning,
        severity: 'warning'
      });

      alerts.push({
        name: `Critical ${metric.replace('_', ' ')}`,
        metric: metric,
        condition: '>=',
        threshold: thresholds.critical,
        severity: 'critical'
      });
    });

    // [advice from AI] 서비스별 알림
    services.forEach(service => {
      alerts.push({
        name: `${service.name} Service Down`,
        metric: 'service_up',
        condition: '==',
        threshold: 0,
        severity: 'critical',
        service: service.name
      });
    });

    return alerts;
  }

  // [advice from AI] 헬스 상태 계산
  calculateHealthStatus(metrics) {
    const serviceStatuses = {};
    let overallScore = 100;

    // [advice from AI] 각 메트릭에 대한 점수 계산
    Object.entries(metrics).forEach(([metric, values]) => {
      if (this.thresholds[metric] && values.length > 0) {
        const currentValue = values[values.length - 1].value;
        const threshold = this.thresholds[metric];

        if (currentValue >= threshold.critical) {
          overallScore -= 30;
        } else if (currentValue >= threshold.warning) {
          overallScore -= 15;
        }
      }
    });

    const overallHealth = overallScore >= 90 ? 'healthy' : 
                         overallScore >= 70 ? 'warning' : 'critical';

    return {
      overall: overallHealth,
      score: Math.max(0, overallScore),
      services: serviceStatuses
    };
  }

  // [advice from AI] Slack 알림 전송
  async sendSlackAlert(alertMessage) {
    try {
      if (!this.slackWebhook) {
        return { success: false, error: 'Slack webhook URL이 설정되지 않았습니다' };
      }

      const color = {
        info: '#36a64f',
        warning: '#ff9900',
        error: '#ff0000',
        critical: '#8b0000'
      }[alertMessage.severity] || '#36a64f';

      const slackPayload = {
        text: `🚨 ${alertMessage.alert_name}`,
        attachments: [
          {
            color: color,
            fields: [
              {
                title: '테넌트',
                value: alertMessage.tenant_id,
                short: true
              },
              {
                title: '심각도',
                value: alertMessage.severity.toUpperCase(),
                short: true
              },
              {
                title: '현재 값',
                value: alertMessage.metric_value?.toString() || 'N/A',
                short: true
              },
              {
                title: '임계값',
                value: alertMessage.threshold?.toString() || 'N/A',
                short: true
              },
              {
                title: '메시지',
                value: alertMessage.message,
                short: false
              }
            ],
            footer: 'Timbel 모니터링 시스템',
            ts: Math.floor(new Date(alertMessage.timestamp).getTime() / 1000)
          }
        ]
      };

      await axios.post(this.slackWebhook, slackPayload);

      return { success: true };

    } catch (error) {
      console.error('Slack 알림 전송 오류:', error);
      return { success: false, error: error.message };
    }
  }

  // [advice from AI] Mock 함수들
  mockCreateDashboard(dashboard) {
    return {
      success: true,
      data: {
        ...dashboard,
        grafana_url: `${this.grafanaURL}/d/${dashboard.dashboard_id}`,
        api_key: 'mock-api-key-' + dashboard.dashboard_id.substring(0, 8)
      },
      message: 'Mock 대시보드 생성 완료'
    };
  }

  mockCollectMetrics(tenantId, timeRange) {
    const now = new Date();
    const metrics = {};

    this.defaultMetrics.forEach(metric => {
      const values = [];
      for (let i = 0; i < 10; i++) {
        values.push({
          timestamp: new Date(now.getTime() - i * 60000).toISOString(),
          value: Math.random() * 100
        });
      }
      metrics[metric] = values.reverse();
    });

    return {
      success: true,
      data: {
        tenant_id: tenantId,
        time_range: timeRange,
        collected_at: now.toISOString(),
        metrics: metrics
      },
      message: 'Mock 메트릭 수집 완료'
    };
  }

  // [advice from AI] Mock 실시간 상태 (기존 오케스트레이터 시뮬레이터 참고)
  mockGetRealTimeStatus(tenantId) {
    // [advice from AI] 기존 오케스트레이터의 mockMonitorTenant 구조를 참고하여 개선
    const mockStatus = {
      tenant_id: tenantId,
      overall_status: 'healthy', // 기존 오케스트레이터와 동일한 필드명 사용
      services: [ // 기존 오케스트레이터 구조 참고
        {
          name: 'chatbot-service',
          status: 'healthy',
          uptime: '99.8%',
          response_time: 145,
          error_rate: 0.05,
          replicas: 2,
          resources: {
            cpu_usage: 42.3,
            memory_usage: 65.1,
            requests_per_second: 85.2
          }
        },
        {
          name: 'advisor-service',
          status: 'healthy',
          uptime: '99.9%',
          response_time: 230,
          error_rate: 0.02,
          replicas: 1,
          resources: {
            cpu_usage: 67.8,
            memory_usage: 78.4,
            requests_per_second: 45.7
          }
        },
        {
          name: 'stt-service',
          status: 'warning',
          uptime: '98.5%',
          response_time: 340,
          error_rate: 0.08,
          replicas: 1,
          resources: {
            cpu_usage: 78.9,
            memory_usage: 85.2,
            requests_per_second: 23.1
          }
        },
        {
          name: 'tts-service',
          status: 'healthy',
          uptime: '99.7%',
          response_time: 180,
          error_rate: 0.03,
          replicas: 2,
          resources: {
            cpu_usage: 55.4,
            memory_usage: 72.6,
            requests_per_second: 67.3
          }
        }
      ],
      resources: { // 기존 오케스트레이터와 동일한 구조
        cpu_usage: 45.2,
        memory_usage: 67.8,
        disk_usage: 23.4,
        network_io: 156.7
      },
      alerts: [ // 기존 오케스트레이터 구조 참고
        {
          level: 'warning',
          message: 'Memory usage approaching 70% threshold',
          timestamp: '2024-01-20T15:30:00Z',
          service: 'stt-service',
          metric: 'memory_usage',
          current_value: 85.2,
          threshold: 80
        },
        {
          level: 'info',
          message: 'Auto-scaling triggered for advisor-service',
          timestamp: '2024-01-20T15:25:00Z',
          service: 'advisor-service',
          metric: 'cpu_usage',
          current_value: 67.8,
          threshold: 70
        }
      ],
      deployment_info: { // ECP-AI 오케스트레이터 특화 정보
        cluster_status: 'healthy',
        node_count: 3,
        pod_count: 8,
        namespace: `tenant-${tenantId}`,
        ingress_status: 'active',
        load_balancer_ip: '192.168.1.100'
      },
      performance_metrics: { // 성능 지표 추가
        total_requests: 1247,
        successful_requests: 1232,
        failed_requests: 15,
        average_response_time: 185.6,
        p95_response_time: 450.2,
        throughput: 45.3 // requests per second
      },
      last_updated: new Date().toISOString()
    };

    return {
      success: true,
      data: mockStatus,
      message: 'Mock 실시간 상태 조회 완료'
    };
  }

  mockCreateAlert(alert) {
    return {
      success: true,
      data: {
        ...alert,
        rule_id: 'rule-' + alert.alert_id.substring(0, 8),
        alertmanager_url: `${this.alertManagerURL}/#/alerts?filter=${alert.alert_name}`
      },
      message: 'Mock 알림 생성 완료'
    };
  }

  // [advice from AI] 실제 이메일 알림 전송
  async sendEmailAlert(alertMessage) {
    try {
      // [advice from AI] 이메일 서비스가 초기화되지 않은 경우 Mock 사용
      if (!this.emailService.isInitialized) {
        console.log('이메일 서비스가 초기화되지 않음, Mock 이메일 알림:', alertMessage);
        return { success: true };
      }

      // [advice from AI] 알림 심각도에 따른 색상 설정
      const alertColors = {
        info: '#36a64f',
        warning: '#ff9900',
        error: '#ff0000',
        critical: '#8b0000'
      };

      const emailData = {
        to: process.env.ADMIN_EMAIL || 'admin@timbel.com', // 관리자 이메일
        templateName: 'alert_notification',
        variables: {
          alert_name: alertMessage.alert_name,
          message: alertMessage.message,
          tenant_id: alertMessage.tenant_id,
          severity: alertMessage.severity.toUpperCase(),
          metric_value: alertMessage.metric_value?.toString() || 'N/A',
          threshold: alertMessage.threshold?.toString() || 'N/A',
          timestamp: alertMessage.timestamp,
          alert_color: alertColors[alertMessage.severity] || '#36a64f'
        }
      };

      const result = await this.emailService.sendEmail(emailData);
      
      console.log('이메일 알림 전송 성공:', {
        alertId: alertMessage.alert_id,
        messageId: result.data.messageId
      });

      return { success: true, data: result.data };

    } catch (error) {
      console.error('이메일 알림 전송 실패:', error);
      return { success: false, error: error.message };
    }
  }

  async mockSendEmailAlert(alertMessage) {
    console.log('Mock 이메일 알림:', alertMessage);
    return { success: true };
  }

  async mockSendWebhookAlert(alertMessage) {
    console.log('Mock 웹훅 알림:', alertMessage);
    return { success: true };
  }
}

module.exports = MonitoringService;
