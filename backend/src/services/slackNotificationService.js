// [advice from AI] Slack 알림 서비스
// 파이프라인 상태, 배포, 롤백, 에러 등에 대한 Slack 알림

const axios = require('axios');

class SlackNotificationService {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL;
    this.botToken = process.env.SLACK_BOT_TOKEN;
    this.defaultChannel = process.env.SLACK_DEFAULT_CHANNEL || '#cicd-notifications';
    this.enabled = process.env.ENABLE_SLACK_NOTIFICATIONS !== 'false';
    
    console.log('📢 SlackNotificationService 초기화 완료');
    console.log(`   Slack 알림: ${this.enabled ? '활성화' : '비활성화'}`);
    console.log(`   기본 채널: ${this.defaultChannel}`);
  }

  /**
   * Slack 메시지 전송 (Webhook)
   */
  async sendWebhookMessage(message, channel = null) {
    try {
      if (!this.enabled) {
        console.log('⏸️ Slack 알림이 비활성화되어 있습니다');
        return { success: false, message: 'Slack notifications disabled' };
      }
      
      if (!this.webhookUrl) {
        console.warn('⚠️ Slack Webhook URL이 설정되지 않음');
        return { success: false, message: 'Slack webhook URL not configured' };
      }
      
      const payload = {
        channel: channel || this.defaultChannel,
        ...message
      };
      
      const response = await axios.post(this.webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.data === 'ok') {
        console.log(`✅ Slack 메시지 전송 성공: ${channel || this.defaultChannel}`);
        return { success: true, message: 'Message sent' };
      } else {
        throw new Error(response.data);
      }
      
    } catch (error) {
      console.error('❌ Slack 메시지 전송 실패:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * 파이프라인 시작 알림
   */
  async notifyPipelineStarted(pipelineInfo) {
    const message = {
      text: `🚀 파이프라인 시작`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚀 파이프라인 실행 시작',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*파이프라인:*\n${pipelineInfo.pipeline_name}`
            },
            {
              type: 'mrkdwn',
              text: `*실행 ID:*\n\`${pipelineInfo.execution_id}\``
            },
            {
              type: 'mrkdwn',
              text: `*트리거:*\n${pipelineInfo.trigger_by || 'manual'}`
            },
            {
              type: 'mrkdwn',
              text: `*환경:*\n${pipelineInfo.deployment_target || 'development'}`
            }
          ]
        }
      ]
    };
    
    if (pipelineInfo.branch) {
      message.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*브랜치:* \`${pipelineInfo.branch}\`\n*커밋:* \`${pipelineInfo.commit_hash?.substring(0, 8) || 'N/A'}\``
        }
      });
    }
    
    return await this.sendWebhookMessage(message, pipelineInfo.slack_channel);
  }

  /**
   * 파이프라인 성공 알림
   */
  async notifyPipelineSuccess(pipelineInfo) {
    const durationMin = pipelineInfo.duration_seconds 
      ? Math.round(pipelineInfo.duration_seconds / 60)
      : 0;
    
    const message = {
      text: `✅ 파이프라인 성공`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '✅ 파이프라인 실행 성공',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*파이프라인:*\n${pipelineInfo.pipeline_name}`
            },
            {
              type: 'mrkdwn',
              text: `*실행 ID:*\n\`${pipelineInfo.execution_id}\``
            },
            {
              type: 'mrkdwn',
              text: `*소요 시간:*\n${durationMin}분`
            },
            {
              type: 'mrkdwn',
              text: `*환경:*\n${pipelineInfo.deployment_target || 'development'}`
            }
          ]
        }
      ]
    };
    
    if (pipelineInfo.docker_image) {
      message.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*배포 이미지:*\n\`${pipelineInfo.docker_image}:${pipelineInfo.docker_tag}\``
        }
      });
    }
    
    if (pipelineInfo.tests_total) {
      message.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*테스트 결과:*\n✅ ${pipelineInfo.tests_passed}/${pipelineInfo.tests_total} 통과`
        }
      });
    }
    
    if (pipelineInfo.build_url) {
      message.blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '빌드 로그 보기',
              emoji: true
            },
            url: pipelineInfo.build_url,
            style: 'primary'
          }
        ]
      });
    }
    
    return await this.sendWebhookMessage(message, pipelineInfo.slack_channel);
  }

  /**
   * 파이프라인 실패 알림
   */
  async notifyPipelineFailure(pipelineInfo) {
    const message = {
      text: `❌ 파이프라인 실패`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '❌ 파이프라인 실행 실패',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*파이프라인:*\n${pipelineInfo.pipeline_name}`
            },
            {
              type: 'mrkdwn',
              text: `*실행 ID:*\n\`${pipelineInfo.execution_id}\``
            },
            {
              type: 'mrkdwn',
              text: `*실패 스테이지:*\n${pipelineInfo.error_stage || 'Unknown'}`
            },
            {
              type: 'mrkdwn',
              text: `*환경:*\n${pipelineInfo.deployment_target || 'development'}`
            }
          ]
        }
      ]
    };
    
    if (pipelineInfo.error_message) {
      message.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*에러 메시지:*\n\`\`\`${pipelineInfo.error_message.substring(0, 500)}\`\`\``
        }
      });
    }
    
    if (pipelineInfo.build_url) {
      message.blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '빌드 로그 보기',
              emoji: true
            },
            url: pipelineInfo.build_url,
            style: 'danger'
          }
        ]
      });
    }
    
    return await this.sendWebhookMessage(message, pipelineInfo.slack_channel);
  }

  /**
   * 롤백 알림
   */
  async notifyRollback(rollbackInfo) {
    const message = {
      text: `🔄 자동 롤백 실행`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔄 자동 롤백 실행',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*파이프라인:*\n${rollbackInfo.pipeline_name}`
            },
            {
              type: 'mrkdwn',
              text: `*롤백 ID:*\n\`${rollbackInfo.rollback_execution_id}\``
            },
            {
              type: 'mrkdwn',
              text: `*원인:*\n${rollbackInfo.trigger_reason || '배포 실패'}`
            },
            {
              type: 'mrkdwn',
              text: `*상태:*\n${rollbackInfo.success ? '✅ 성공' : '❌ 실패'}`
            }
          ]
        }
      ]
    };
    
    if (rollbackInfo.previous_version) {
      message.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*롤백 버전:*\n\`${rollbackInfo.previous_version.image}:${rollbackInfo.previous_version.tag}\``
        }
      });
    }
    
    return await this.sendWebhookMessage(message, rollbackInfo.slack_channel);
  }

  /**
   * 승인 요청 알림
   */
  async notifyApprovalRequired(approvalInfo) {
    const message = {
      text: `⏸️ 승인 필요`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⏸️ 프로덕션 배포 승인 필요',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*파이프라인:*\n${approvalInfo.pipeline_name}`
            },
            {
              type: 'mrkdwn',
              text: `*실행 ID:*\n\`${approvalInfo.execution_id}\``
            },
            {
              type: 'mrkdwn',
              text: `*환경:*\n${approvalInfo.deployment_target}`
            },
            {
              type: 'mrkdwn',
              text: `*요청자:*\n${approvalInfo.trigger_by}`
            }
          ]
        }
      ]
    };
    
    if (approvalInfo.changes_summary) {
      message.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*변경 사항:*\n${approvalInfo.changes_summary}`
        }
      });
    }
    
    if (approvalInfo.approval_url) {
      message.blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '✅ 승인',
              emoji: true
            },
            url: approvalInfo.approval_url,
            style: 'primary',
            value: 'approve'
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '❌ 거부',
              emoji: true
            },
            url: approvalInfo.approval_url,
            style: 'danger',
            value: 'reject'
          }
        ]
      });
    }
    
    return await this.sendWebhookMessage(message, approvalInfo.slack_channel);
  }

  /**
   * 시스템 경고 알림
   */
  async notifySystemAlert(alertInfo) {
    const severityEmoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };
    
    const emoji = severityEmoji[alertInfo.severity] || 'ℹ️';
    
    const message = {
      text: `${emoji} 시스템 경고`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${emoji} 시스템 경고: ${alertInfo.alert_name}`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*심각도:*\n${alertInfo.severity.toUpperCase()}`
            },
            {
              type: 'mrkdwn',
              text: `*서비스:*\n${alertInfo.service_name || 'N/A'}`
            },
            {
              type: 'mrkdwn',
              text: `*발생 시간:*\n${new Date(alertInfo.timestamp).toLocaleString('ko-KR')}`
            },
            {
              type: 'mrkdwn',
              text: `*영향 범위:*\n${alertInfo.affected_components || 'N/A'}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*메시지:*\n${alertInfo.message}`
          }
        }
      ]
    };
    
    if (alertInfo.metrics) {
      const metricsText = Object.entries(alertInfo.metrics)
        .map(([key, value]) => `• ${key}: ${value}`)
        .join('\n');
      
      message.blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*메트릭:*\n${metricsText}`
        }
      });
    }
    
    return await this.sendWebhookMessage(message, alertInfo.slack_channel);
  }

  /**
   * 간단한 텍스트 메시지 전송
   */
  async sendSimpleMessage(text, channel = null) {
    const message = {
      text: text
    };
    
    return await this.sendWebhookMessage(message, channel);
  }

  /**
   * 커스텀 메시지 전송
   */
  async sendCustomMessage(blocks, text = '', channel = null) {
    const message = {
      text: text,
      blocks: blocks
    };
    
    return await this.sendWebhookMessage(message, channel);
  }

  /**
   * Slack 설정 확인
   */
  checkConfiguration() {
    return {
      enabled: this.enabled,
      webhookConfigured: !!this.webhookUrl,
      botTokenConfigured: !!this.botToken,
      defaultChannel: this.defaultChannel
    };
  }
}

// Singleton 인스턴스
let slackNotificationServiceInstance = null;

function getSlackNotificationService() {
  if (!slackNotificationServiceInstance) {
    slackNotificationServiceInstance = new SlackNotificationService();
  }
  return slackNotificationServiceInstance;
}

module.exports = {
  SlackNotificationService,
  getSlackNotificationService
};

