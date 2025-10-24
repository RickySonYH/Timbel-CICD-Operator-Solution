// [advice from AI] 알림 규칙 엔진 서비스
// 임계값 기반 알림 규칙 평가 및 실행

const { databaseManager } = require('../config/database');
const slackService = require('./slackNotificationService');
const emailService = require('./emailNotificationService');

class AlertRuleEngine {
  constructor() {
    this.evaluationIntervalSeconds = 60; // 1분마다 평가
    this.isRunning = false;
  }

  /**
   * 알림 규칙 엔진 시작
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  알림 규칙 엔진이 이미 실행 중입니다');
      return;
    }

    this.isRunning = true;
    console.log('🚨 알림 규칙 엔진 시작...');
    
    // 주기적으로 규칙 평가
    this.intervalId = setInterval(() => {
      this.evaluateAllRules().catch(error => {
        console.error('❌ 알림 규칙 평가 중 오류:', error);
      });
    }, this.evaluationIntervalSeconds * 1000);
  }

  /**
   * 알림 규칙 엔진 중지
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      console.log('🛑 알림 규칙 엔진 중지됨');
    }
  }

  /**
   * 모든 활성화된 규칙 평가
   */
  async evaluateAllRules() {
    try {
      const knowledgePool = databaseManager.getPool('knowledge');
      if (!knowledgePool) {
        console.error('❌ 데이터베이스 연결 풀을 가져올 수 없습니다');
        return;
      }
      
      const result = await knowledgePool.query(`
        SELECT * FROM alert_rules 
        WHERE enabled = true
        ORDER BY severity DESC, created_at DESC
      `);

      const rules = result.rows;
      console.log(`📋 ${rules.length}개의 활성 알림 규칙 평가 중...`);

      for (const rule of rules) {
        await this.evaluateRule(rule);
      }
    } catch (error) {
      console.error('❌ 규칙 평가 실패:', error);
      throw error;
    }
  }

  /**
   * 개별 규칙 평가
   */
  async evaluateRule(rule) {
    try {
      // Cooldown 체크
      if (rule.last_triggered_at && rule.cooldown_minutes) {
        const cooldownMs = rule.cooldown_minutes * 60 * 1000;
        const timeSinceLastTrigger = Date.now() - new Date(rule.last_triggered_at).getTime();
        
        if (timeSinceLastTrigger < cooldownMs) {
          return; // Cooldown 기간 중
        }
      }

      // 메트릭 값 가져오기
      const metricValue = await this.getMetricValue(rule);
      
      if (metricValue === null || metricValue === undefined) {
        return; // 메트릭을 가져올 수 없음
      }

      // 조건 평가
      const isTriggered = this.evaluateCondition(
        metricValue,
        rule.threshold_operator,
        rule.threshold_value
      );

      if (isTriggered) {
        await this.triggerAlert(rule, metricValue);
      }
    } catch (error) {
      console.error(`❌ 규칙 평가 실패 [${rule.rule_name}]:`, error);
    }
  }

  /**
   * 메트릭 값 가져오기
   */
  async getMetricValue(rule) {
    try {
      switch (rule.metric_type) {
        case 'cpu_usage':
          return await this.getCpuUsage(rule);
        case 'memory_usage':
          return await this.getMemoryUsage(rule);
        case 'disk_usage':
          return await this.getDiskUsage(rule);
        case 'pod_count':
          return await this.getPodCount(rule);
        case 'pod_restart_count':
          return await this.getPodRestartCount(rule);
        case 'response_time':
          return await this.getResponseTime(rule);
        case 'error_rate':
          return await this.getErrorRate(rule);
        case 'pipeline_status':
          return await this.getPipelineStatus(rule);
        case 'deployment_status':
          return await this.getDeploymentStatus(rule);
        case 'node_status':
          return await this.getNodeStatus(rule);
        default:
          console.warn(`⚠️  알 수 없는 메트릭 타입: ${rule.metric_type}`);
          return null;
      }
    } catch (error) {
      console.error(`❌ 메트릭 값 가져오기 실패 [${rule.metric_type}]:`, error);
      return null;
    }
  }

  /**
   * CPU 사용률 가져오기
   */
  async getCpuUsage(rule) {
    try {
      const axios = require('axios');
      const prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
      
      const query = rule.resource_name
        ? `avg(rate(container_cpu_usage_seconds_total{pod="${rule.resource_name}"}[5m])) * 100`
        : `avg(rate(container_cpu_usage_seconds_total[5m])) * 100`;

      const response = await axios.get(`${prometheusUrl}/api/v1/query`, {
        params: { query }
      });

      if (response.data.status === 'success' && response.data.data.result.length > 0) {
        return parseFloat(response.data.data.result[0].value[1]);
      }
      return null;
    } catch (error) {
      console.error('❌ CPU 사용률 조회 실패:', error);
      return null;
    }
  }

  /**
   * 메모리 사용률 가져오기
   */
  async getMemoryUsage(rule) {
    try {
      const axios = require('axios');
      const prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
      
      const query = rule.resource_name
        ? `(sum(container_memory_usage_bytes{pod="${rule.resource_name}"}) / sum(container_spec_memory_limit_bytes{pod="${rule.resource_name}"})) * 100`
        : `(sum(container_memory_usage_bytes) / sum(container_spec_memory_limit_bytes)) * 100`;

      const response = await axios.get(`${prometheusUrl}/api/v1/query`, {
        params: { query }
      });

      if (response.data.status === 'success' && response.data.data.result.length > 0) {
        return parseFloat(response.data.data.result[0].value[1]);
      }
      return null;
    } catch (error) {
      console.error('❌ 메모리 사용률 조회 실패:', error);
      return null;
    }
  }

  /**
   * 디스크 사용률 가져오기
   */
  async getDiskUsage(rule) {
    try {
      const axios = require('axios');
      const prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
      
      const query = `(sum(node_filesystem_size_bytes - node_filesystem_free_bytes) / sum(node_filesystem_size_bytes)) * 100`;

      const response = await axios.get(`${prometheusUrl}/api/v1/query`, {
        params: { query }
      });

      if (response.data.status === 'success' && response.data.data.result.length > 0) {
        return parseFloat(response.data.data.result[0].value[1]);
      }
      return null;
    } catch (error) {
      console.error('❌ 디스크 사용률 조회 실패:', error);
      return null;
    }
  }

  /**
   * Pod 개수 가져오기
   */
  async getPodCount(rule) {
    try {
      const result = await knowledgePool.query(`
        SELECT COUNT(*) as count
        FROM deployments
        WHERE status = 'running'
        ${rule.cluster_name ? 'AND cluster = $1' : ''}
        ${rule.namespace ? 'AND namespace = $2' : ''}
      `, rule.cluster_name ? [rule.cluster_name, rule.namespace].filter(Boolean) : []);

      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('❌ Pod 개수 조회 실패:', error);
      return null;
    }
  }

  /**
   * Pod 재시작 횟수 가져오기
   */
  async getPodRestartCount(rule) {
    try {
      const axios = require('axios');
      const prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
      
      const query = rule.resource_name
        ? `sum(kube_pod_container_status_restarts_total{pod="${rule.resource_name}"})`
        : `sum(kube_pod_container_status_restarts_total)`;

      const response = await axios.get(`${prometheusUrl}/api/v1/query`, {
        params: { query }
      });

      if (response.data.status === 'success' && response.data.data.result.length > 0) {
        return parseFloat(response.data.data.result[0].value[1]);
      }
      return null;
    } catch (error) {
      console.error('❌ Pod 재시작 횟수 조회 실패:', error);
      return null;
    }
  }

  /**
   * 응답 시간 가져오기
   */
  async getResponseTime(rule) {
    // Mock 구현 - 실제로는 APM 도구나 Prometheus에서 가져와야 함
    return Math.random() * 2000; // 0-2000ms
  }

  /**
   * 에러율 가져오기
   */
  async getErrorRate(rule) {
    // Mock 구현 - 실제로는 APM 도구나 로그 분석에서 가져와야 함
    return Math.random() * 10; // 0-10%
  }

  /**
   * 파이프라인 상태 가져오기
   */
  async getPipelineStatus(rule) {
    try {
      const result = await knowledgePool.query(`
        SELECT status
        FROM pipeline_history
        WHERE pipeline_name = $1
        ORDER BY executed_at DESC
        LIMIT 1
      `, [rule.resource_name]);

      if (result.rows.length > 0) {
        return result.rows[0].status === 'failed' ? 0 : 1; // 0 = failed, 1 = success
      }
      return null;
    } catch (error) {
      console.error('❌ 파이프라인 상태 조회 실패:', error);
      return null;
    }
  }

  /**
   * 배포 상태 가져오기
   */
  async getDeploymentStatus(rule) {
    try {
      const result = await knowledgePool.query(`
        SELECT status
        FROM deployments
        WHERE deployment_name = $1
        ORDER BY deployed_at DESC
        LIMIT 1
      `, [rule.resource_name]);

      if (result.rows.length > 0) {
        return result.rows[0].status === 'failed' ? 0 : 1; // 0 = failed, 1 = success
      }
      return null;
    } catch (error) {
      console.error('❌ 배포 상태 조회 실패:', error);
      return null;
    }
  }

  /**
   * 노드 상태 가져오기
   */
  async getNodeStatus(rule) {
    try {
      const axios = require('axios');
      const prometheusUrl = process.env.PROMETHEUS_URL || 'http://prometheus:9090';
      
      const query = `sum(up{job="node-exporter"})`;

      const response = await axios.get(`${prometheusUrl}/api/v1/query`, {
        params: { query }
      });

      if (response.data.status === 'success' && response.data.data.result.length > 0) {
        return parseFloat(response.data.data.result[0].value[1]);
      }
      return null;
    } catch (error) {
      console.error('❌ 노드 상태 조회 실패:', error);
      return null;
    }
  }

  /**
   * 조건 평가
   */
  evaluateCondition(metricValue, operator, thresholdValue) {
    switch (operator) {
      case 'gt':
        return metricValue > thresholdValue;
      case 'lt':
        return metricValue < thresholdValue;
      case 'gte':
        return metricValue >= thresholdValue;
      case 'lte':
        return metricValue <= thresholdValue;
      case 'eq':
        return metricValue === thresholdValue;
      case 'neq':
        return metricValue !== thresholdValue;
      default:
        return false;
    }
  }

  /**
   * 알림 트리거
   */
  async triggerAlert(rule, metricValue) {
    try {
      console.log(`🚨 알림 트리거: [${rule.rule_name}] ${metricValue} ${rule.threshold_operator} ${rule.threshold_value}`);

      const knowledgePool = databaseManager.getPool('knowledge');
      if (!knowledgePool) {
        console.error('❌ 데이터베이스 연결 풀을 가져올 수 없습니다');
        return null;
      }

      // 알림 메시지 생성
      const message = this.generateAlertMessage(rule, metricValue);

      // 알림 이력 저장
      const historyResult = await knowledgePool.query(`
        INSERT INTO alert_history (
          rule_id, metric_value, threshold_value, severity, message,
          cluster_name, namespace, resource_name, notification_channels
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        rule.id,
        metricValue,
        rule.threshold_value,
        rule.severity,
        message,
        rule.cluster_name,
        rule.namespace,
        rule.resource_name,
        rule.notification_channels
      ]);

      const alertId = historyResult.rows[0].id;

      // 규칙 통계 업데이트
      await knowledgePool.query(`
        UPDATE alert_rules
        SET last_triggered_at = CURRENT_TIMESTAMP,
            trigger_count = trigger_count + 1
        WHERE id = $1
      `, [rule.id]);

      // 알림 전송
      await this.sendNotifications(rule, message, alertId);

      return alertId;
    } catch (error) {
      console.error('❌ 알림 트리거 실패:', error);
      throw error;
    }
  }

  /**
   * 알림 메시지 생성
   */
  generateAlertMessage(rule, metricValue) {
    const operatorText = {
      gt: '>',
      lt: '<',
      gte: '>=',
      lte: '<=',
      eq: '=',
      neq: '!='
    };

    const severityEmoji = {
      info: 'ℹ️',
      warning: '⚠️',
      critical: '🔴'
    };

    return `${severityEmoji[rule.severity]} **${rule.rule_name}**\n\n` +
           `📊 메트릭: ${rule.metric_type}\n` +
           `📈 현재 값: ${metricValue.toFixed(2)} ${rule.comparison_unit || ''}\n` +
           `🎯 임계값: ${operatorText[rule.threshold_operator]} ${rule.threshold_value} ${rule.comparison_unit || ''}\n` +
           `🏷️  심각도: ${rule.severity}\n` +
           (rule.cluster_name ? `🖥️  클러스터: ${rule.cluster_name}\n` : '') +
           (rule.namespace ? `📦 네임스페이스: ${rule.namespace}\n` : '') +
           (rule.resource_name ? `🔧 리소스: ${rule.resource_name}\n` : '') +
           `\n${rule.description || ''}`;
  }

  /**
   * 알림 전송
   */
  async sendNotifications(rule, message, alertId) {
    const channels = Array.isArray(rule.notification_channels) 
      ? rule.notification_channels 
      : [];

    const promises = [];

    if (channels.includes('slack')) {
      promises.push(
        slackService.sendAlert(rule.severity, rule.rule_name, message)
          .catch(error => console.error('❌ Slack 알림 전송 실패:', error))
      );
    }

    if (channels.includes('email')) {
      promises.push(
        emailService.sendAlert(rule.created_by, rule.rule_name, message, rule.severity)
          .catch(error => console.error('❌ Email 알림 전송 실패:', error))
      );
    }

    await Promise.allSettled(promises);

    // 알림 전송 상태 업데이트
    await knowledgePool.query(`
      UPDATE alert_history
      SET notification_sent = true
      WHERE id = $1
    `, [alertId]);
  }

  /**
   * 알림 해결 처리
   */
  async resolveAlert(alertId, resolvedBy, resolutionNote) {
    try {
      const knowledgePool = databaseManager.getPool('knowledge');
      if (!knowledgePool) {
        throw new Error('데이터베이스 연결 풀을 가져올 수 없습니다');
      }
      
      await knowledgePool.query(`
        UPDATE alert_history
        SET resolved_at = CURRENT_TIMESTAMP,
            resolved_by = $1,
            resolution_note = $2
        WHERE id = $3
      `, [resolvedBy, resolutionNote, alertId]);

      console.log(`✅ 알림 해결됨: ${alertId}`);
    } catch (error) {
      console.error('❌ 알림 해결 실패:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스
const alertRuleEngine = new AlertRuleEngine();

module.exports = alertRuleEngine;

