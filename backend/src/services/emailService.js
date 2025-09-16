// [advice from AI] 실제 이메일 전송 서비스
// nodemailer를 사용한 실제 이메일 발송 기능 구현

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class EmailService {
  constructor() {
    this.transporter = null;
    this.templates = new Map();
    this.isInitialized = false;
  }

  // [advice from AI] 이메일 서비스 초기화
  async initialize(emailSettings) {
    try {
      if (!emailSettings || !emailSettings.enabled) {
        throw new Error('이메일 설정이 비활성화되어 있습니다');
      }

      // [advice from AI] SMTP 설정 검증
      const requiredFields = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPassword', 'fromEmail', 'fromName'];
      for (const field of requiredFields) {
        if (!emailSettings[field]) {
          throw new Error(`필수 이메일 설정이 누락되었습니다: ${field}`);
        }
      }

      // [advice from AI] nodemailer transporter 생성
      this.transporter = nodemailer.createTransporter({
        host: emailSettings.smtpHost,
        port: parseInt(emailSettings.smtpPort),
        secure: emailSettings.useSSL, // SSL 사용 여부
        auth: {
          user: emailSettings.smtpUser,
          pass: emailSettings.smtpPassword
        },
        tls: {
          rejectUnauthorized: emailSettings.useTLS
        }
      });

      // [advice from AI] 연결 테스트
      await this.transporter.verify();
      
      this.isInitialized = true;
      console.log('이메일 서비스가 성공적으로 초기화되었습니다');
      
      return {
        success: true,
        message: '이메일 서비스 초기화 완료'
      };

    } catch (error) {
      console.error('이메일 서비스 초기화 실패:', error);
      this.isInitialized = false;
      throw new Error(`이메일 서비스 초기화 실패: ${error.message}`);
    }
  }

  // [advice from AI] 이메일 템플릿 로드
  async loadTemplate(templateName, templateContent) {
    try {
      if (!templateContent) {
        throw new Error('템플릿 내용이 없습니다');
      }

      // [advice from AI] Handlebars 템플릿 컴파일
      const compiledTemplate = handlebars.compile(templateContent);
      this.templates.set(templateName, compiledTemplate);
      
      console.log(`템플릿 로드 완료: ${templateName}`);
      return {
        success: true,
        message: `템플릿 '${templateName}' 로드 완료`
      };

    } catch (error) {
      console.error('템플릿 로드 실패:', error);
      throw new Error(`템플릿 로드 실패: ${error.message}`);
    }
  }

  // [advice from AI] 기본 템플릿들 로드
  async loadDefaultTemplates() {
    try {
      const defaultTemplates = {
        'user_login': {
          subject: '로그인 알림',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">로그인 알림</h2>
              <p>안녕하세요 {{username}}님,</p>
              <p>{{date}}에 Timbel 플랫폼에 로그인하셨습니다.</p>
              <p>로그인 정보:</p>
              <ul>
                <li>시간: {{loginTime}}</li>
                <li>IP 주소: {{ipAddress}}</li>
                <li>브라우저: {{userAgent}}</li>
              </ul>
              <p>만약 본인이 로그인하지 않으셨다면, 즉시 비밀번호를 변경해주세요.</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">이 이메일은 Timbel 시스템에서 자동으로 발송되었습니다.</p>
            </div>
          `
        },
        'system_error': {
          subject: '시스템 오류 발생',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #d32f2f;">시스템 오류 알림</h2>
              <p>시스템에서 오류가 발생했습니다.</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #d32f2f; margin: 15px 0;">
                <p><strong>오류 메시지:</strong> {{error_message}}</p>
                <p><strong>발생 시간:</strong> {{timestamp}}</p>
                <p><strong>서비스:</strong> {{service_name}}</p>
                <p><strong>심각도:</strong> {{severity}}</p>
              </div>
              <p>관리자에게 즉시 연락하여 문제를 해결해주세요.</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">이 이메일은 Timbel 모니터링 시스템에서 자동으로 발송되었습니다.</p>
            </div>
          `
        },
        'backup_completed': {
          subject: '백업 완료 알림',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2e7d32;">백업 완료 알림</h2>
              <p>백업이 성공적으로 완료되었습니다.</p>
              <div style="background-color: #e8f5e8; padding: 15px; border-left: 4px solid #2e7d32; margin: 15px 0;">
                <p><strong>백업 파일:</strong> {{backup_name}}</p>
                <p><strong>백업 크기:</strong> {{backup_size}}</p>
                <p><strong>완료 시간:</strong> {{completion_time}}</p>
                <p><strong>백업 위치:</strong> {{backup_location}}</p>
              </div>
              <p>백업 파일이 안전하게 저장되었습니다.</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">이 이메일은 Timbel 백업 시스템에서 자동으로 발송되었습니다.</p>
            </div>
          `
        },
        'alert_notification': {
          subject: '{{alert_name}} 알림',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: {{alert_color}};">{{alert_name}}</h2>
              <p>{{message}}</p>
              <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid {{alert_color}}; margin: 15px 0;">
                <p><strong>테넌트:</strong> {{tenant_id}}</p>
                <p><strong>심각도:</strong> {{severity}}</p>
                <p><strong>현재 값:</strong> {{metric_value}}</p>
                <p><strong>임계값:</strong> {{threshold}}</p>
                <p><strong>발생 시간:</strong> {{timestamp}}</p>
              </div>
              <p>시스템 상태를 확인하고 필요한 조치를 취해주세요.</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">이 이메일은 Timbel 모니터링 시스템에서 자동으로 발송되었습니다.</p>
            </div>
          `
        },
        'approval_new_request': {
          subject: '새로운 승인 요청 - {{request_title}}',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1976d2;">승인 요청 알림</h2>
              <p>안녕하세요 {{recipient_name}}님,</p>
              <p>{{requester_name}}님이 승인을 요청했습니다.</p>
              <div style="background-color: #e3f2fd; padding: 20px; border-left: 4px solid #1976d2; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1976d2;">{{request_title}}</h3>
                <p><strong>요청 유형:</strong> {{request_type}}</p>
                <p><strong>금액:</strong> {{amount}} {{currency}}</p>
                <p><strong>요청자:</strong> {{requester_name}}</p>
                <p><strong>마감일:</strong> {{due_date}}</p>
                <p><strong>설명:</strong> {{description}}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{approval_url}}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">승인 처리하기</a>
              </div>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">이 이메일은 Timbel 승인 시스템에서 자동으로 발송되었습니다.</p>
            </div>
          `
        },
        'approval_approval_response': {
          subject: '승인 응답 알림 - {{request_title}}',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: {{status_color}};">승인 응답 알림</h2>
              <p>안녕하세요 {{recipient_name}}님,</p>
              <p>{{request_title}}에 대한 승인이 {{status_text}}되었습니다.</p>
              <div style="background-color: {{status_bg_color}}; padding: 20px; border-left: 4px solid {{status_color}}; margin: 20px 0;">
                <h3 style="margin-top: 0; color: {{status_color}};">{{request_title}}</h3>
                <p><strong>상태:</strong> {{status_text}}</p>
                <p><strong>응답자:</strong> {{approver_name}}</p>
                <p><strong>응답 시간:</strong> {{response_time}}</p>
                <p><strong>댓글:</strong> {{comment}}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{request_url}}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">요청 상세보기</a>
              </div>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">이 이메일은 Timbel 승인 시스템에서 자동으로 발송되었습니다.</p>
            </div>
          `
        },
        'decision_new_decision': {
          subject: '새로운 의사결정 요청 - {{request_title}}',
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #388e3c;">의사결정 요청 알림</h2>
              <p>안녕하세요 {{recipient_name}}님,</p>
              <p>{{requester_name}}님이 의사결정에 참여를 요청했습니다.</p>
              <div style="background-color: #e8f5e8; padding: 20px; border-left: 4px solid #388e3c; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #388e3c;">{{request_title}}</h3>
                <p><strong>의사결정 유형:</strong> {{request_type}}</p>
                <p><strong>요청자:</strong> {{requester_name}}</p>
                <p><strong>투표 마감일:</strong> {{voting_deadline}}</p>
                <p><strong>의사결정 마감일:</strong> {{decision_deadline}}</p>
                <p><strong>설명:</strong> {{description}}</p>
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{decision_url}}" style="background-color: #388e3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">의사결정 참여하기</a>
              </div>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">이 이메일은 Timbel 의사결정 시스템에서 자동으로 발송되었습니다.</p>
            </div>
          `
        }
      };

      // [advice from AI] 각 템플릿 로드
      for (const [name, template] of Object.entries(defaultTemplates)) {
        await this.loadTemplate(name, template.content);
      }

      console.log('기본 템플릿 로드 완료');
      return {
        success: true,
        message: '기본 템플릿 로드 완료',
        templates: Object.keys(defaultTemplates)
      };

    } catch (error) {
      console.error('기본 템플릿 로드 실패:', error);
      throw new Error(`기본 템플릿 로드 실패: ${error.message}`);
    }
  }

  // [advice from AI] 이메일 전송
  async sendEmail(emailData) {
    try {
      if (!this.isInitialized) {
        throw new Error('이메일 서비스가 초기화되지 않았습니다');
      }

      const {
        to,
        templateName,
        subject,
        variables = {},
        attachments = [],
        cc = [],
        bcc = []
      } = emailData;

      if (!to || (!templateName && !subject)) {
        throw new Error('수신자와 제목 또는 템플릿이 필요합니다');
      }

      let emailSubject = subject;
      let emailContent = '';

      // [advice from AI] 템플릿 사용 시
      if (templateName) {
        const template = this.templates.get(templateName);
        if (!template) {
          throw new Error(`템플릿을 찾을 수 없습니다: ${templateName}`);
        }

        // [advice from AI] 템플릿 변수 처리
        const templateVars = {
          ...variables,
          timestamp: new Date().toISOString(),
          date: new Date().toLocaleDateString('ko-KR'),
          time: new Date().toLocaleTimeString('ko-KR')
        };

        emailContent = template(templateVars);
        
        // [advice from AI] 템플릿별 기본 제목 설정
        if (!emailSubject) {
          const defaultSubjects = {
            'user_login': '로그인 알림',
            'system_error': '시스템 오류 발생',
            'backup_completed': '백업 완료 알림',
            'alert_notification': `${variables.alert_name || '알림'} 발생`
          };
          emailSubject = defaultSubjects[templateName] || 'Timbel 알림';
        }
      } else {
        // [advice from AI] 직접 내용 사용 시
        emailContent = variables.content || '';
      }

      // [advice from AI] 이메일 옵션 구성
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'Timbel System'}" <${process.env.EMAIL_FROM_EMAIL || 'noreply@timbel.com'}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: emailSubject,
        html: emailContent,
        attachments: attachments
      };

      // [advice from AI] CC, BCC 설정
      if (cc.length > 0) {
        mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
      }
      if (bcc.length > 0) {
        mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
      }

      // [advice from AI] 이메일 전송
      const result = await this.transporter.sendMail(mailOptions);

      console.log('이메일 전송 성공:', {
        messageId: result.messageId,
        to: to,
        subject: emailSubject
      });

      return {
        success: true,
        data: {
          messageId: result.messageId,
          to: to,
          subject: emailSubject,
          sentAt: new Date().toISOString()
        },
        message: '이메일 전송 완료'
      };

    } catch (error) {
      console.error('이메일 전송 실패:', error);
      throw new Error(`이메일 전송 실패: ${error.message}`);
    }
  }

  // [advice from AI] 테스트 이메일 전송
  async sendTestEmail(testEmail, emailSettings) {
    try {
      // [advice from AI] 임시로 이메일 서비스 초기화
      const originalInitialized = this.isInitialized;
      if (!originalInitialized) {
        await this.initialize(emailSettings);
      }

      const testResult = await this.sendEmail({
        to: testEmail,
        subject: 'Timbel 이메일 서비스 테스트',
        variables: {
          content: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2e7d32;">이메일 서비스 테스트</h2>
              <p>안녕하세요!</p>
              <p>이 이메일은 Timbel 이메일 서비스가 정상적으로 작동하는지 테스트하기 위해 발송되었습니다.</p>
              <div style="background-color: #e8f5e8; padding: 15px; border-left: 4px solid #2e7d32; margin: 15px 0;">
                <p><strong>발송 시간:</strong> ${new Date().toLocaleString('ko-KR')}</p>
                <p><strong>테스트 ID:</strong> ${uuidv4().substring(0, 8)}</p>
                <p><strong>상태:</strong> 정상 작동</p>
              </div>
              <p>이메일 서비스가 정상적으로 설정되었습니다.</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">이 이메일은 Timbel 시스템에서 자동으로 발송되었습니다.</p>
            </div>
          `
        }
      });

      return testResult;

    } catch (error) {
      console.error('테스트 이메일 전송 실패:', error);
      throw new Error(`테스트 이메일 전송 실패: ${error.message}`);
    }
  }

  // [advice from AI] 이메일 서비스 상태 확인
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasTransporter: !!this.transporter,
      loadedTemplates: Array.from(this.templates.keys()),
      timestamp: new Date().toISOString()
    };
  }

  // [advice from AI] 이메일 서비스 종료
  async close() {
    try {
      if (this.transporter) {
        this.transporter.close();
        this.transporter = null;
      }
      this.templates.clear();
      this.isInitialized = false;
      console.log('이메일 서비스가 종료되었습니다');
    } catch (error) {
      console.error('이메일 서비스 종료 중 오류:', error);
    }
  }
}

module.exports = EmailService;
