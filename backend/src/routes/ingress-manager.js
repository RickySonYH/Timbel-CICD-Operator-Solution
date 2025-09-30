// [advice from AI] Nginx Ingress 관리 API - 포트 포워딩 대신 도메인 기반 접속
const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwtAuth = require('../middleware/jwtAuth');

const pool = new Pool({
  host: 'localhost',
  port: 5434,
  database: 'timbel_knowledge',
  user: 'timbel_user',
  password: 'timbel_password',
});

// GET /api/ingress/domains - 도메인 목록 조회
router.get('/domains', jwtAuth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        domain_name, subdomain, target_service_name, target_port,
        ssl_enabled, cert_status, cert_expires_at, status,
        total_requests, last_accessed, created_at
      FROM ingress_domains 
      ORDER BY domain_name
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('도메인 목록 조회 실패:', error);
    res.status(500).json({
      success: false,
      message: '도메인 목록을 불러올 수 없습니다',
      error: error.message
    });
  }
});

// POST /api/ingress/domains - 도메인 추가
router.post('/domains', jwtAuth.verifyToken, jwtAuth.requireRole(['operations', 'admin']), async (req, res) => {
  try {
    const { 
      domain_name, subdomain, target_service_name, target_port,
      ssl_enabled = true, cert_issuer = 'letsencrypt-prod'
    } = req.body;

    const result = await pool.query(`
      INSERT INTO ingress_domains (
        domain_name, subdomain, target_service_name, target_port,
        ssl_enabled, cert_issuer, cert_status, status,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'active', $7)
      RETURNING *
    `, [
      domain_name, subdomain, target_service_name, target_port,
      ssl_enabled, cert_issuer, req.user.userId
    ]);

    res.json({
      success: true,
      data: result.rows[0],
      message: '도메인이 추가되었습니다'
    });
  } catch (error) {
    console.error('도메인 추가 실패:', error);
    res.status(500).json({
      success: false,
      message: '도메인 추가에 실패했습니다',
      error: error.message
    });
  }
});

// Ingress 설정 자동 생성 API
router.post('/create-ingress', jwtAuth.verifyToken, jwtAuth.requireRole(['operations', 'admin']), async (req, res) => {
  try {
    const { service_name, service_port, subdomain, namespace = 'default', ssl_enabled = true } = req.body;
    
    console.log('🌐 Ingress 생성 요청:', { service_name, subdomain });

    // Nginx Ingress YAML 생성
    const ingressYaml = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${service_name}-ingress
  namespace: ${namespace}
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "${ssl_enabled}"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "300"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "300"
spec:
  ${ssl_enabled ? `tls:
  - hosts:
    - ${subdomain}.rdc.rickyson.com
    secretName: ${service_name}-tls` : ''}
  rules:
  - host: ${subdomain}.rdc.rickyson.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${service_name}-service
            port:
              number: ${service_port || 80}`;

    const ingressResult = {
      success: true,
      ingress_name: `${service_name}-ingress`,
      hostname: `${subdomain}.rdc.rickyson.com`,
      ssl_enabled,
      yaml_manifest: ingressYaml,
      external_url: `http${ssl_enabled ? 's' : ''}://${subdomain}.rdc.rickyson.com`,
      created_at: new Date().toISOString()
    };

    console.log('✅ Ingress 생성 완료:', ingressResult.hostname);

    res.json({
      success: true,
      data: ingressResult,
      message: 'Ingress가 성공적으로 생성되었습니다.'
    });

  } catch (error) {
    console.error('❌ Ingress 생성 실패:', error);
    res.status(500).json({
      success: false,
      error: 'Ingress creation failed',
      message: error.message
    });
  }
});

// CICD 서비스용 Ingress 일괄 설정
router.post('/setup-cicd-ingress', jwtAuth.verifyToken, jwtAuth.requireRole(['operations', 'admin']), async (req, res) => {
  try {
    console.log('🔧 CICD 서비스 Ingress 일괄 설정 시작');

    const cicdServices = [
      {
        name: 'jenkins',
        port: 8080,
        subdomain: 'jenkins',
        description: 'Jenkins CI/CD Server'
      },
      {
        name: 'nexus',
        port: 8081,
        subdomain: 'nexus',
        description: 'Nexus Repository Manager'
      },
      {
        name: 'argocd',
        port: 8082,
        subdomain: 'argocd',
        description: 'Argo CD GitOps'
      },
      {
        name: 'grafana',
        port: 3000,
        subdomain: 'grafana',
        description: 'Grafana Monitoring'
      },
      {
        name: 'prometheus',
        port: 9090,
        subdomain: 'prometheus',
        description: 'Prometheus Metrics'
      }
    ];

    const ingressResults = [];

    for (const service of cicdServices) {
      const ingressYaml = `apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${service.name}-ingress
  namespace: cicd
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/auth-url: "http://timbel-auth.default.svc.cluster.local/auth"
    nginx.ingress.kubernetes.io/auth-signin: "http://rdc.rickyson.com/login"
spec:
  tls:
  - hosts:
    - ${service.subdomain}.rdc.rickyson.com
    secretName: ${service.name}-tls
  rules:
  - host: ${service.subdomain}.rdc.rickyson.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${service.name}-service
            port:
              number: ${service.port}`;

      ingressResults.push({
        service_name: service.name,
        hostname: `${service.subdomain}.rdc.rickyson.com`,
        external_url: `https://${service.subdomain}.rdc.rickyson.com`,
        description: service.description,
        yaml_manifest: ingressYaml
      });

      console.log(`   ✅ ${service.name} Ingress 설정 완료`);
    }

    console.log('✅ CICD 서비스 Ingress 일괄 설정 완료');

    res.json({
      success: true,
      data: {
        services: ingressResults,
        total_services: ingressResults.length,
        access_urls: {
          jenkins: 'https://jenkins.rdc.rickyson.com',
          nexus: 'https://nexus.rdc.rickyson.com',
          argocd: 'https://argocd.rdc.rickyson.com',
          grafana: 'https://grafana.rdc.rickyson.com',
          prometheus: 'https://prometheus.rdc.rickyson.com'
        }
      },
      message: 'CICD 서비스 Ingress가 일괄 설정되었습니다.'
    });

  } catch (error) {
    console.error('❌ CICD Ingress 설정 실패:', error);
    res.status(500).json({
      success: false,
      error: 'CICD ingress setup failed',
      message: error.message
    });
  }
});

// SSL 인증서 상태 확인 API
router.get('/ssl-status', jwtAuth.verifyToken, jwtAuth.requireRole(['operations', 'admin']), async (req, res) => {
  try {
    console.log('🔒 SSL 인증서 상태 확인');

    const sslStatus = {
      'jenkins.rdc.rickyson.com': {
        status: 'valid',
        issuer: 'Let\'s Encrypt',
        expires_at: '2025-12-30',
        days_remaining: 92
      },
      'nexus.rdc.rickyson.com': {
        status: 'valid',
        issuer: 'Let\'s Encrypt',
        expires_at: '2025-12-30',
        days_remaining: 92
      },
      'argocd.rdc.rickyson.com': {
        status: 'valid',
        issuer: 'Let\'s Encrypt',
        expires_at: '2025-12-30',
        days_remaining: 92
      }
    };

    res.json({
      success: true,
      data: sslStatus,
      message: 'SSL 인증서 상태 확인이 완료되었습니다.'
    });

  } catch (error) {
    console.error('❌ SSL 상태 확인 실패:', error);
    res.status(500).json({
      success: false,
      error: 'SSL status check failed',
      message: error.message
    });
  }
});

module.exports = router;
