// [advice from AI] TLS 인증서 모니터링 및 알림 서비스
const { Pool } = require('pg');
const cron = require('node-cron');

// PostgreSQL 연결
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: 'timbel_cicd_operator',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

class CertificateMonitoringService {
  constructor() {
    this.scheduledTask = null;
  }

  /**
   * 모니터링 서비스 시작
   */
  start() {
    console.log('🔐 TLS 인증서 모니터링 서비스 시작...');

    // 매일 오전 9시에 만료 임박 인증서 체크
    this.scheduledTask = cron.schedule('0 9 * * *', async () => {
      console.log('⏰ 일일 인증서 만료 체크 시작');
      await this.checkExpiringCertificates();
    });

    // 즉시 한 번 실행
    this.checkExpiringCertificates();

    console.log('✅ TLS 인증서 모니터링 스케줄러 활성화');
  }

  /**
   * 모니터링 서비스 중지
   */
  stop() {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      console.log('⏹️ TLS 인증서 모니터링 서비스 중지');
    }
  }

  /**
   * 만료 임박 인증서 체크 및 알림
   */
  async checkExpiringCertificates() {
    try {
      console.log('🔍 만료 임박 인증서 검색 중...');

      // 만료 임박 인증서 조회 (30일, 7일, 1일)
      const expiringCerts = await pool.query(`
        SELECT 
          id,
          domain,
          certificate_type,
          issuer,
          expiry_date,
          status,
          EXTRACT(DAY FROM (expiry_date - NOW()))::INTEGER as days_until_expiry
        FROM tls_certificates
        WHERE 
          status = 'active' 
          AND expiry_date > NOW()
          AND expiry_date <= NOW() + INTERVAL '30 days'
        ORDER BY expiry_date ASC
      `);

      if (expiringCerts.rows.length === 0) {
        console.log('✅ 만료 임박 인증서 없음');
        return {
          success: true,
          expiringCount: 0,
          certificates: []
        };
      }

      console.log(`⚠️ 만료 임박 인증서 ${expiringCerts.rows.length}개 발견`);

      // 심각도별 분류
      const critical = []; // 7일 이하
      const warning = [];  // 8-30일
      const expired = [];  // 이미 만료됨

      expiringCerts.rows.forEach(cert => {
        if (cert.days_until_expiry < 0) {
          expired.push(cert);
        } else if (cert.days_until_expiry <= 7) {
          critical.push(cert);
        } else {
          warning.push(cert);
        }
      });

      // 이미 만료된 인증서 상태 업데이트
      if (expired.length > 0) {
        await this.markCertificatesAsExpired(expired.map(c => c.id));
        console.log(`🚨 만료된 인증서 ${expired.length}개 - 상태 업데이트 완료`);
      }

      // 알림 생성
      if (critical.length > 0) {
        await this.createNotifications(critical, 'critical');
        console.log(`🚨 긴급: ${critical.length}개 인증서가 7일 이내 만료 예정`);
      }

      if (warning.length > 0) {
        await this.createNotifications(warning, 'warning');
        console.log(`⚠️ 경고: ${warning.length}개 인증서가 30일 이내 만료 예정`);
      }

      return {
        success: true,
        expiringCount: expiringCerts.rows.length,
        critical: critical.length,
        warning: warning.length,
        expired: expired.length,
        certificates: expiringCerts.rows
      };

    } catch (error) {
      console.error('❌ 인증서 만료 체크 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 만료된 인증서 상태 업데이트
   */
  async markCertificatesAsExpired(certIds) {
    try {
      await pool.query(`
        UPDATE tls_certificates 
        SET status = 'expired', updated_at = NOW()
        WHERE id = ANY($1::uuid[])
      `, [certIds]);

      console.log(`✅ ${certIds.length}개 인증서 상태를 'expired'로 업데이트`);
    } catch (error) {
      console.error('❌ 인증서 상태 업데이트 실패:', error);
    }
  }

  /**
   * 알림 생성
   */
  async createNotifications(certificates, severity) {
    try {
      const notifications = certificates.map(cert => ({
        type: 'certificate_expiry',
        severity,
        title: `인증서 만료 ${severity === 'critical' ? '긴급' : '경고'}`,
        message: `도메인 "${cert.domain}"의 인증서가 ${cert.days_until_expiry}일 후 만료됩니다.`,
        metadata: {
          certificate_id: cert.id,
          domain: cert.domain,
          expiry_date: cert.expiry_date,
          days_until_expiry: cert.days_until_expiry
        }
      }));

      // 알림 테이블에 저장 (알림 테이블이 있다고 가정)
      for (const notification of notifications) {
        console.log(`📢 알림 생성: ${notification.message}`);
        // TODO: 실제 알림 시스템과 연동 (이메일, Slack 등)
      }

    } catch (error) {
      console.error('❌ 알림 생성 실패:', error);
    }
  }

  /**
   * 인증서 통계 조회
   */
  async getCertificateStatistics() {
    try {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_certificates,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired,
          COUNT(CASE WHEN status = 'revoked' THEN 1 END) as revoked,
          COUNT(CASE WHEN 
            status = 'active' 
            AND expiry_date > NOW() 
            AND expiry_date <= NOW() + INTERVAL '30 days' 
          THEN 1 END) as expiring_soon,
          COUNT(CASE WHEN 
            status = 'active' 
            AND expiry_date > NOW() 
            AND expiry_date <= NOW() + INTERVAL '7 days' 
          THEN 1 END) as expiring_critical
        FROM tls_certificates
      `);

      return {
        success: true,
        statistics: stats.rows[0]
      };
    } catch (error) {
      console.error('❌ 인증서 통계 조회 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 인증서 갱신 권장 사항
   */
  async getRenewalRecommendations() {
    try {
      const recommendations = await pool.query(`
        SELECT 
          id,
          domain,
          certificate_type,
          expiry_date,
          EXTRACT(DAY FROM (expiry_date - NOW()))::INTEGER as days_until_expiry,
          CASE 
            WHEN EXTRACT(DAY FROM (expiry_date - NOW())) <= 7 THEN 'urgent'
            WHEN EXTRACT(DAY FROM (expiry_date - NOW())) <= 30 THEN 'recommended'
            ELSE 'normal'
          END as priority
        FROM tls_certificates
        WHERE 
          status = 'active'
          AND expiry_date > NOW()
          AND expiry_date <= NOW() + INTERVAL '30 days'
        ORDER BY expiry_date ASC
      `);

      return {
        success: true,
        recommendations: recommendations.rows
      };
    } catch (error) {
      console.error('❌ 갱신 권장 사항 조회 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const certificateMonitoringService = new CertificateMonitoringService();
module.exports = certificateMonitoringService;
