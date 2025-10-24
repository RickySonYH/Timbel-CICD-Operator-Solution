// [advice from AI] Email 알림 서비스
// Nodemailer를 사용한 이메일 알림 시스템

const nodemailer = require('nodemailer');

class EmailNotificationService {
  constructor() {
    this.enabled = process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false';
    
    // SMTP 설정
    this.smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    };
    
    // 발신자 정보
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@timbel.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Timbel CI/CD Operator';
    
    // Transporter 생성
    this.transporter = null;
    if (this.enabled && this.smtpConfig.auth.user && this.smtpConfig.auth.pass) {
      this.transporter = nodemailer.createTransport(this.smtpConfig);
      console.log('📧 EmailNotificationService 초기화 완료');
      console.log(`   SMTP: ${this.smtpConfig.host}:${this.smtpConfig.port}`);
    } else {
      console.log('⏸️ Email 알림이 비활성화되어 있거나 SMTP 설정이 없습니다');
    }
  }

  /**
   * 이메일 전송
   */
  async sendEmail(to, subject, html, text = null) {
    try {
      if (!this.enabled) {
        console.log('⏸️ Email 알림이 비활성화되어 있습니다');
        return { success: false, message: 'Email notifications disabled' };
      }
      
      if (!this.transporter) {
        console.warn('⚠️ Email transporter가 설정되지 않음');
        return { success: false, message: 'Email transporter not configured' };
      }
      
      // 이메일 옵션
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        text: text || this.stripHtml(html),
        html: html
      };
      
      // 이메일 전송
      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`✅ Email 전송 성공: ${to}`);
      console.log(`   메시지 ID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        message: 'Email sent successfully'
      };
      
    } catch (error) {
      console.error('❌ Email 전송 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 파이프라인 시작 알림
   */
  async notifyPipelineStarted(recipients, pipelineInfo) {
    const subject = `🚀 [${pipelineInfo.pipeline_name}] 파이프라인 실행 시작`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .info-table td { padding: 10px; border-bottom: 1px solid #ddd; }
          .info-table td:first-child { font-weight: bold; width: 150px; }
          .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
          .badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge-info { background: #3498db; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🚀 파이프라인 실행 시작</h2>
          </div>
          <div class="content">
            <p>파이프라인 실행이 시작되었습니다.</p>
            
            <table class="info-table">
              <tr>
                <td>파이프라인</td>
                <td><strong>${pipelineInfo.pipeline_name}</strong></td>
              </tr>
              <tr>
                <td>실행 ID</td>
                <td><code>${pipelineInfo.execution_id}</code></td>
              </tr>
              <tr>
                <td>트리거</td>
                <td>${pipelineInfo.trigger_by || 'manual'}</td>
              </tr>
              <tr>
                <td>환경</td>
                <td><span class="badge badge-info">${pipelineInfo.deployment_target || 'development'}</span></td>
              </tr>
              ${pipelineInfo.branch ? `
              <tr>
                <td>브랜치</td>
                <td><code>${pipelineInfo.branch}</code></td>
              </tr>
              ` : ''}
              ${pipelineInfo.commit_hash ? `
              <tr>
                <td>커밋</td>
                <td><code>${pipelineInfo.commit_hash.substring(0, 8)}</code></td>
              </tr>
              ` : ''}
              <tr>
                <td>시작 시간</td>
                <td>${new Date().toLocaleString('ko-KR')}</td>
              </tr>
            </table>
            
            ${pipelineInfo.build_url ? `
            <p style="text-align: center;">
              <a href="${pipelineInfo.build_url}" style="display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                빌드 로그 보기
              </a>
            </p>
            ` : ''}
          </div>
          <div class="footer">
            <p>Timbel CI/CD Operator © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(recipients, subject, html);
  }

  /**
   * 파이프라인 성공 알림
   */
  async notifyPipelineSuccess(recipients, pipelineInfo) {
    const durationMin = pipelineInfo.duration_seconds 
      ? Math.round(pipelineInfo.duration_seconds / 60)
      : 0;
    
    const subject = `✅ [${pipelineInfo.pipeline_name}] 파이프라인 실행 성공`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .info-table td { padding: 10px; border-bottom: 1px solid #ddd; }
          .info-table td:first-child { font-weight: bold; width: 150px; }
          .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
          .badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge-success { background: #27ae60; color: white; }
          .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>✅ 파이프라인 실행 성공</h2>
          </div>
          <div class="content">
            <div class="success-icon">🎉</div>
            <p>파이프라인이 성공적으로 완료되었습니다!</p>
            
            <table class="info-table">
              <tr>
                <td>파이프라인</td>
                <td><strong>${pipelineInfo.pipeline_name}</strong></td>
              </tr>
              <tr>
                <td>실행 ID</td>
                <td><code>${pipelineInfo.execution_id}</code></td>
              </tr>
              <tr>
                <td>소요 시간</td>
                <td><strong>${durationMin}분</strong></td>
              </tr>
              <tr>
                <td>환경</td>
                <td><span class="badge badge-success">${pipelineInfo.deployment_target || 'development'}</span></td>
              </tr>
              ${pipelineInfo.docker_image ? `
              <tr>
                <td>배포 이미지</td>
                <td><code>${pipelineInfo.docker_image}:${pipelineInfo.docker_tag}</code></td>
              </tr>
              ` : ''}
              ${pipelineInfo.tests_total ? `
              <tr>
                <td>테스트 결과</td>
                <td>✅ ${pipelineInfo.tests_passed}/${pipelineInfo.tests_total} 통과</td>
              </tr>
              ` : ''}
              <tr>
                <td>완료 시간</td>
                <td>${new Date().toLocaleString('ko-KR')}</td>
              </tr>
            </table>
            
            ${pipelineInfo.build_url ? `
            <p style="text-align: center;">
              <a href="${pipelineInfo.build_url}" style="display: inline-block; padding: 12px 24px; background: #27ae60; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                빌드 로그 보기
              </a>
            </p>
            ` : ''}
          </div>
          <div class="footer">
            <p>Timbel CI/CD Operator © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(recipients, subject, html);
  }

  /**
   * 파이프라인 실패 알림
   */
  async notifyPipelineFailure(recipients, pipelineInfo) {
    const subject = `❌ [${pipelineInfo.pipeline_name}] 파이프라인 실행 실패`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #eb3349 0%, #f45c43 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .info-table td { padding: 10px; border-bottom: 1px solid #ddd; }
          .info-table td:first-child { font-weight: bold; width: 150px; }
          .error-box { background: #ffebee; border-left: 4px solid #e74c3c; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
          .badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge-danger { background: #e74c3c; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>❌ 파이프라인 실행 실패</h2>
          </div>
          <div class="content">
            <p>파이프라인 실행 중 오류가 발생했습니다.</p>
            
            <table class="info-table">
              <tr>
                <td>파이프라인</td>
                <td><strong>${pipelineInfo.pipeline_name}</strong></td>
              </tr>
              <tr>
                <td>실행 ID</td>
                <td><code>${pipelineInfo.execution_id}</code></td>
              </tr>
              <tr>
                <td>실패 스테이지</td>
                <td><span class="badge badge-danger">${pipelineInfo.error_stage || 'Unknown'}</span></td>
              </tr>
              <tr>
                <td>환경</td>
                <td>${pipelineInfo.deployment_target || 'development'}</td>
              </tr>
              <tr>
                <td>실패 시간</td>
                <td>${new Date().toLocaleString('ko-KR')}</td>
              </tr>
            </table>
            
            ${pipelineInfo.error_message ? `
            <div class="error-box">
              <strong>에러 메시지:</strong><br>
              <pre style="white-space: pre-wrap; font-size: 12px;">${pipelineInfo.error_message.substring(0, 500)}</pre>
            </div>
            ` : ''}
            
            ${pipelineInfo.build_url ? `
            <p style="text-align: center;">
              <a href="${pipelineInfo.build_url}" style="display: inline-block; padding: 12px 24px; background: #e74c3c; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
                빌드 로그 보기
              </a>
            </p>
            ` : ''}
          </div>
          <div class="footer">
            <p>Timbel CI/CD Operator © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(recipients, subject, html);
  }

  /**
   * 롤백 알림
   */
  async notifyRollback(recipients, rollbackInfo) {
    const subject = `🔄 [${rollbackInfo.pipeline_name}] 자동 롤백 실행`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .info-table td { padding: 10px; border-bottom: 1px solid #ddd; }
          .info-table td:first-child { font-weight: bold; width: 150px; }
          .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
          .badge { display: inline-block; padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
          .badge-warning { background: #f39c12; color: white; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔄 자동 롤백 실행</h2>
          </div>
          <div class="content">
            <p>배포 실패로 인해 자동 롤백이 실행되었습니다.</p>
            
            <table class="info-table">
              <tr>
                <td>파이프라인</td>
                <td><strong>${rollbackInfo.pipeline_name}</strong></td>
              </tr>
              <tr>
                <td>롤백 ID</td>
                <td><code>${rollbackInfo.rollback_execution_id}</code></td>
              </tr>
              <tr>
                <td>원인</td>
                <td>${rollbackInfo.trigger_reason || '배포 실패'}</td>
              </tr>
              <tr>
                <td>상태</td>
                <td><span class="badge ${rollbackInfo.success ? 'badge-success' : 'badge-danger'}">${rollbackInfo.success ? '✅ 성공' : '❌ 실패'}</span></td>
              </tr>
              ${rollbackInfo.previous_version ? `
              <tr>
                <td>롤백 버전</td>
                <td><code>${rollbackInfo.previous_version.image}:${rollbackInfo.previous_version.tag}</code></td>
              </tr>
              ` : ''}
              <tr>
                <td>실행 시간</td>
                <td>${new Date().toLocaleString('ko-KR')}</td>
              </tr>
            </table>
          </div>
          <div class="footer">
            <p>Timbel CI/CD Operator © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(recipients, subject, html);
  }

  /**
   * 승인 요청 알림
   */
  async notifyApprovalRequired(recipients, approvalInfo) {
    const subject = `⏸️ [${approvalInfo.pipeline_name}] 프로덕션 배포 승인 필요`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .info-table td { padding: 10px; border-bottom: 1px solid #ddd; }
          .info-table td:first-child { font-weight: bold; width: 150px; }
          .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
          .button-group { text-align: center; margin: 30px 0; }
          .button { display: inline-block; padding: 12px 30px; margin: 0 10px; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
          .button-approve { background: #27ae60; }
          .button-reject { background: #e74c3c; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>⏸️ 프로덕션 배포 승인 필요</h2>
          </div>
          <div class="content">
            <p>프로덕션 환경으로의 배포 승인이 필요합니다.</p>
            
            <table class="info-table">
              <tr>
                <td>파이프라인</td>
                <td><strong>${approvalInfo.pipeline_name}</strong></td>
              </tr>
              <tr>
                <td>실행 ID</td>
                <td><code>${approvalInfo.execution_id}</code></td>
              </tr>
              <tr>
                <td>환경</td>
                <td><strong>${approvalInfo.deployment_target}</strong></td>
              </tr>
              <tr>
                <td>요청자</td>
                <td>${approvalInfo.trigger_by}</td>
              </tr>
              <tr>
                <td>요청 시간</td>
                <td>${new Date().toLocaleString('ko-KR')}</td>
              </tr>
            </table>
            
            ${approvalInfo.changes_summary ? `
            <p><strong>변경 사항:</strong></p>
            <p>${approvalInfo.changes_summary}</p>
            ` : ''}
            
            ${approvalInfo.approval_url ? `
            <div class="button-group">
              <a href="${approvalInfo.approval_url}?action=approve" class="button button-approve">✅ 승인</a>
              <a href="${approvalInfo.approval_url}?action=reject" class="button button-reject">❌ 거부</a>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Timbel CI/CD Operator © ${new Date().getFullYear()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    return await this.sendEmail(recipients, subject, html);
  }

  /**
   * HTML 태그 제거 (플레인 텍스트용)
   */
  stripHtml(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * SMTP 연결 테스트
   */
  async testConnection() {
    try {
      if (!this.transporter) {
        return {
          success: false,
          message: 'Email transporter not configured'
        };
      }
      
      await this.transporter.verify();
      
      console.log('✅ SMTP 연결 테스트 성공');
      return {
        success: true,
        message: 'SMTP connection successful'
      };
      
    } catch (error) {
      console.error('❌ SMTP 연결 테스트 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Email 설정 확인
   */
  checkConfiguration() {
    return {
      enabled: this.enabled,
      smtpConfigured: !!(this.smtpConfig.auth.user && this.smtpConfig.auth.pass),
      smtpHost: this.smtpConfig.host,
      smtpPort: this.smtpConfig.port,
      fromEmail: this.fromEmail,
      fromName: this.fromName
    };
  }
}

// Singleton 인스턴스
let emailNotificationServiceInstance = null;

function getEmailNotificationService() {
  if (!emailNotificationServiceInstance) {
    emailNotificationServiceInstance = new EmailNotificationService();
  }
  return emailNotificationServiceInstance;
}

module.exports = {
  EmailNotificationService,
  getEmailNotificationService
};

