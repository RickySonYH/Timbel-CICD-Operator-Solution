// [advice from AI] Kubernetes Ingress 관리 API
const express = require('express');
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');
const kubernetesService = require('../services/kubernetesService');
const certificateMonitoringService = require('../services/certificateMonitoringService');

const router = express.Router();

// [advice from AI] 데이터베이스 연결 풀
const pool = new Pool({
  user: 'timbel_user',
  host: 'postgres',
  database: 'timbel_cicd_operator',
  password: 'timbel_password',
  port: 5432,
});

// [advice from AI] Ingress 도메인 목록 조회
router.get('/domains', jwtAuth.verifyToken, async (req, res) => {
  try {
    // 실제 Ingress 도메인 데이터가 없을 때 기본 도메인 구조 제공
    const result = await pool.query(`
      SELECT 
        cluster_name,
        endpoint_url,
        region,
        status
      FROM kubernetes_clusters
      WHERE status = 'active'
    `);

    // 실제 클러스터가 있으면 해당 클러스터 기반 도메인 생성
    let domains = [];
    
    if (result.rows.length > 0) {
      // 실제 클러스터 기반 도메인
      result.rows.forEach(cluster => {
        const baseUrl = cluster.endpoint_url || 'localhost';
        domains.push(
          { domain_name: `jenkins.${baseUrl}`, subdomain: 'jenkins', cluster_name: cluster.cluster_name },
          { domain_name: `nexus.${baseUrl}`, subdomain: 'nexus', cluster_name: cluster.cluster_name },
          { domain_name: `argocd.${baseUrl}`, subdomain: 'argocd', cluster_name: cluster.cluster_name },
          { domain_name: `grafana.${baseUrl}`, subdomain: 'grafana', cluster_name: cluster.cluster_name },
          { domain_name: `prometheus.${baseUrl}`, subdomain: 'prometheus', cluster_name: cluster.cluster_name }
        );
      });
    } else {
      // 클러스터가 없을 때 빈 배열 반환 (404가 아닌 빈 데이터)
      domains = [];
    }

    res.json({
      success: true,
      data: domains,
      message: domains.length === 0 ? 
        '등록된 클러스터가 없습니다. 먼저 클러스터를 등록해주세요.' : 
        `${domains.length}개 도메인 조회 완료`
    });

  } catch (error) {
    console.error('Ingress 도메인 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Ingress 도메인 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Ingress 규칙 생성 (DB + Kubernetes 연동)
router.post('/rules', jwtAuth.verifyToken, async (req, res) => {
  try {
    const {
      rule_name,
      host,
      service_name,
      service_port,
      path = '/',
      cluster_id,
      namespace = 'default',
      annotations = {},
      tls_enabled = false,
      cert_issuer = 'selfsigned-issuer',
      apply_to_k8s = true
    } = req.body;

    console.log(`📝 Ingress 규칙 생성: ${rule_name} (${host})`);

    // 1. 데이터베이스에 저장
    const result = await pool.query(`
      INSERT INTO ingress_rules (
        rule_name, host, service_name, service_port, path,
        cluster_id, namespace, annotations, created_by, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      rule_name,
      host,
      service_name,
      service_port,
      path,
      cluster_id,
      namespace,
      JSON.stringify(annotations),
      req.user?.id || 'system',
      'pending'
    ]);

    const savedRule = result.rows[0];
    let k8sResult = null;

    // 2. Kubernetes에 실제 적용
    if (apply_to_k8s) {
      try {
        console.log(`🚀 Kubernetes에 Ingress 적용 중: ${rule_name}`);
        
        k8sResult = await kubernetesService.createIngress({
          name: rule_name,
          namespace,
          host,
          serviceName: service_name,
          servicePort: service_port,
          path,
          tlsEnabled: tls_enabled,
          tlsSecretName: `${rule_name}-tls`,
          certIssuer: cert_issuer,
          annotations
        });

        // DB 상태 업데이트
        await pool.query(`
          UPDATE ingress_rules 
          SET status = 'active', updated_at = NOW()
          WHERE id = $1
        `, [savedRule.id]);

        savedRule.status = 'active';

        console.log(`✅ Kubernetes Ingress 생성 완료: ${rule_name}`);
      } catch (k8sError) {
        console.error('❌ Kubernetes Ingress 생성 실패:', k8sError.message);
        
        // DB 상태를 error로 업데이트
        await pool.query(`
          UPDATE ingress_rules 
          SET status = 'error', updated_at = NOW()
          WHERE id = $1
        `, [savedRule.id]);

        savedRule.status = 'error';
        savedRule.error_message = k8sError.message;
      }
    }

    res.json({
      success: true,
      rule: savedRule,
      kubernetes: k8sResult,
      message: k8sResult 
        ? 'Ingress 규칙이 생성되고 Kubernetes에 적용되었습니다.'
        : 'Ingress 규칙이 데이터베이스에 저장되었습니다.'
    });

  } catch (error) {
    console.error('Ingress 규칙 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Ingress 규칙 생성 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Ingress 상태 조회
router.get('/status', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_rules,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_rules,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_rules
      FROM ingress_rules
    `);

    res.json({
      success: true,
      status: result.rows[0] || { total_rules: 0, active_rules: 0, inactive_rules: 0 }
    });

  } catch (error) {
    console.error('Ingress 상태 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Ingress 상태 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Kubernetes에서 실제 Ingress 목록 조회
router.get('/k8s/ingresses', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    console.log(`🔍 Kubernetes Ingress 조회: namespace=${namespace}`);
    
    const result = await kubernetesService.listIngresses(namespace);
    
    res.json({
      success: result.success,
      ingresses: result.ingresses || [],
      total: result.ingresses?.length || 0,
      namespace
    });
  } catch (error) {
    console.error('❌ Kubernetes Ingress 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Kubernetes Ingress 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] Kubernetes에서 Certificate 목록 조회
router.get('/k8s/certificates', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { namespace = 'default' } = req.query;
    console.log(`🔍 Kubernetes Certificate 조회: namespace=${namespace}`);
    
    const result = await kubernetesService.listCertificates(namespace);
    
    res.json({
      success: result.success,
      certificates: result.certificates || [],
      total: result.certificates?.length || 0,
      namespace
    });
  } catch (error) {
    console.error('❌ Kubernetes Certificate 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Kubernetes Certificate 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] DB Ingress 규칙을 Kubernetes에 동기화
router.post('/rules/:id/sync', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔄 Ingress 동기화: ${id}`);
    
    const result = await kubernetesService.syncIngressFromDB(id);
    
    res.json({
      success: true,
      ingress: result.ingress,
      message: result.message
    });
  } catch (error) {
    console.error('❌ Ingress 동기화 오류:', error);
    res.status(500).json({
      success: false,
      error: 'Ingress 동기화 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] ========== TLS/SSL 인증서 관리 API ==========

// TLS 인증서 목록 조회
router.get('/certificates', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('📋 TLS 인증서 목록 조회');
    
    const result = await pool.query(`
      SELECT 
        id,
        domain,
        certificate_type,
        issuer,
        subject,
        issued_date,
        expiry_date,
        status,
        secret_name,
        namespace,
        cluster_id,
        created_by,
        created_at,
        updated_at,
        EXTRACT(DAY FROM (expiry_date - NOW()))::INTEGER as days_until_expiry
      FROM tls_certificates
      ORDER BY expiry_date ASC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ TLS 인증서 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: 'TLS 인증서 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// TLS 인증서 추가 (수동 업로드)
router.post('/certificates', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('➕ TLS 인증서 추가');
    
    const {
      domain,
      certificate_type = 'manual',
      cert_data,
      key_data,
      ca_cert,
      issuer,
      subject,
      issued_date,
      expiry_date,
      cluster_id,
      namespace = 'default'
    } = req.body;
    
    if (!domain || !cert_data || !key_data || !expiry_date) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다. (domain, cert_data, key_data, expiry_date)'
      });
    }
    
    // Kubernetes Secret 이름 생성
    const secret_name = `${domain.replace(/\./g, '-')}-tls`;
    
    const result = await pool.query(`
      INSERT INTO tls_certificates (
        domain, certificate_type, cert_data, key_data, ca_cert,
        issuer, subject, issued_date, expiry_date,
        secret_name, namespace, cluster_id, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13)
      RETURNING 
        id, domain, certificate_type, issuer, expiry_date, 
        status, secret_name, namespace, created_at
    `, [
      domain, certificate_type, cert_data, key_data, ca_cert,
      issuer, subject, issued_date, expiry_date,
      secret_name, namespace, cluster_id, req.user?.id || 'system'
    ]);
    
    console.log('✅ TLS 인증서 추가 완료:', domain);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'TLS 인증서가 성공적으로 추가되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ TLS 인증서 추가 오류:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: '이미 등록된 도메인입니다.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'TLS 인증서 추가 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// TLS 인증서 수정
router.put('/certificates/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('✏️ TLS 인증서 수정:', id);
    
    const {
      cert_data,
      key_data,
      ca_cert,
      expiry_date,
      status
    } = req.body;
    
    const result = await pool.query(`
      UPDATE tls_certificates 
      SET 
        cert_data = COALESCE($2, cert_data),
        key_data = COALESCE($3, key_data),
        ca_cert = COALESCE($4, ca_cert),
        expiry_date = COALESCE($5, expiry_date),
        status = COALESCE($6, status),
        updated_by = $7,
        updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id, domain, certificate_type, issuer, expiry_date, 
        status, secret_name, namespace, updated_at
    `, [id, cert_data, key_data, ca_cert, expiry_date, status, req.user?.id || 'system']);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'TLS 인증서를 찾을 수 없습니다.'
      });
    }
    
    console.log('✅ TLS 인증서 수정 완료:', result.rows[0].domain);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'TLS 인증서가 성공적으로 수정되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ TLS 인증서 수정 오류:', error);
    res.status(500).json({
      success: false,
      error: 'TLS 인증서 수정 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// TLS 인증서 삭제
router.delete('/certificates/:id', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ TLS 인증서 삭제:', id);
    
    const result = await pool.query(`
      DELETE FROM tls_certificates 
      WHERE id = $1
      RETURNING domain
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'TLS 인증서를 찾을 수 없습니다.'
      });
    }
    
    console.log('✅ TLS 인증서 삭제 완료:', result.rows[0].domain);
    
    res.json({
      success: true,
      message: 'TLS 인증서가 성공적으로 삭제되었습니다.'
    });
    
  } catch (error) {
    console.error('❌ TLS 인증서 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: 'TLS 인증서 삭제 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 만료 임박 인증서 조회
router.get('/certificates/expiring', jwtAuth.verifyToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    console.log(`⚠️ 만료 임박 인증서 조회 (${days}일 이내)`);
    
    const result = await pool.query(`
      SELECT * FROM get_expiring_certificates($1)
    `, [days]);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      threshold_days: days
    });
    
  } catch (error) {
    console.error('❌ 만료 임박 인증서 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '만료 임박 인증서 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// [advice from AI] ========== 인증서 모니터링 API ==========

// 인증서 통계 조회
router.get('/certificates/statistics', jwtAuth.verifyToken, async (req, res) => {
  try {
    const stats = await certificateMonitoringService.getCertificateStatistics();
    res.json(stats);
  } catch (error) {
    console.error('❌ 인증서 통계 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '인증서 통계 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 인증서 갱신 권장 사항 조회
router.get('/certificates/renewal-recommendations', jwtAuth.verifyToken, async (req, res) => {
  try {
    const recommendations = await certificateMonitoringService.getRenewalRecommendations();
    res.json(recommendations);
  } catch (error) {
    console.error('❌ 갱신 권장 사항 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '갱신 권장 사항 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

// 즉시 만료 체크 실행
router.post('/certificates/check-expiry', jwtAuth.verifyToken, async (req, res) => {
  try {
    console.log('🔍 수동 인증서 만료 체크 시작');
    const result = await certificateMonitoringService.checkExpiringCertificates();
    res.json(result);
  } catch (error) {
    console.error('❌ 인증서 만료 체크 오류:', error);
    res.status(500).json({
      success: false,
      error: '인증서 만료 체크 중 오류가 발생했습니다.',
      message: error.message
    });
  }
});

module.exports = router;
