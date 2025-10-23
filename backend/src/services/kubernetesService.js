// [advice from AI] Kubernetes API 연동 서비스 - 프로덕션 레벨
const k8s = require('@kubernetes/client-node');
const { Pool } = require('pg');

// PostgreSQL 연결
const pool = new Pool({
  user: process.env.DB_USER || 'timbel_user',
  host: process.env.DB_HOST || 'postgres',
  database: 'timbel_cicd_operator',
  password: process.env.DB_PASSWORD || 'timbel_password',
  port: process.env.DB_PORT || 5432,
});

class KubernetesService {
  constructor() {
    this.kc = new k8s.KubeConfig();
    try {
      // 클러스터 내부에서 실행 시
      this.kc.loadFromCluster();
      console.log('✅ Kubernetes 클러스터 내부 인증 완료');
    } catch (error) {
      try {
        // 로컬 개발 환경
        this.kc.loadFromDefault();
        console.log('✅ Kubernetes 로컬 kubeconfig 로드 완료');
      } catch (err) {
        console.warn('⚠️ Kubernetes 설정을 로드할 수 없습니다:', err.message);
      }
    }

    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.networkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
  }

  /**
   * Kubernetes 연결 확인
   */
  async checkConnection() {
    try {
      await this.k8sApi.listNamespace();
      return {
        connected: true,
        message: 'Kubernetes API 연결 성공'
      };
    } catch (error) {
      console.error('❌ Kubernetes 연결 실패:', error.message);
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Ingress 리소스 생성
   */
  async createIngress(ingressConfig) {
    try {
      const {
        name,
        namespace = 'default',
        host,
        serviceName,
        servicePort,
        path = '/',
        tlsEnabled = false,
        tlsSecretName,
        certIssuer = 'letsencrypt-staging',
        annotations = {}
      } = ingressConfig;

      console.log(`🔧 Ingress 생성: ${name} (${host})`);

      // 기본 annotations
      const defaultAnnotations = {
        'kubernetes.io/ingress.class': 'nginx',
        ...annotations
      };

      // TLS 활성화 시 cert-manager annotation 추가
      if (tlsEnabled && certIssuer) {
        defaultAnnotations['cert-manager.io/cluster-issuer'] = certIssuer;
      }

      // Ingress 매니페스트 생성
      const ingressManifest = {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
          name,
          namespace,
          annotations: defaultAnnotations
        },
        spec: {
          rules: [
            {
              host,
              http: {
                paths: [
                  {
                    path,
                    pathType: 'Prefix',
                    backend: {
                      service: {
                        name: serviceName,
                        port: {
                          number: servicePort
                        }
                      }
                    }
                  }
                ]
              }
            }
          ]
        }
      };

      // TLS 설정 추가
      if (tlsEnabled) {
        ingressManifest.spec.tls = [
          {
            hosts: [host],
            secretName: tlsSecretName || `${name}-tls`
          }
        ];
      }

      // Kubernetes에 Ingress 생성
      const result = await this.networkingApi.createNamespacedIngress(
        namespace,
        ingressManifest
      );

      console.log(`✅ Ingress 생성 완료: ${name}`);

      return {
        success: true,
        ingress: result.body,
        message: 'Ingress가 성공적으로 생성되었습니다.'
      };
    } catch (error) {
      console.error('❌ Ingress 생성 실패:', error);
      throw new Error(`Ingress 생성 실패: ${error.body?.message || error.message}`);
    }
  }

  /**
   * Ingress 리소스 조회
   */
  async getIngress(name, namespace = 'default') {
    try {
      const result = await this.networkingApi.readNamespacedIngress(name, namespace);
      return {
        success: true,
        ingress: result.body
      };
    } catch (error) {
      if (error.response?.statusCode === 404) {
        return {
          success: false,
          error: 'Ingress를 찾을 수 없습니다.'
        };
      }
      throw error;
    }
  }

  /**
   * 네임스페이스의 모든 Ingress 조회
   */
  async listIngresses(namespace = 'default') {
    try {
      const result = await this.networkingApi.listNamespacedIngress(namespace);
      return {
        success: true,
        ingresses: result.body.items
      };
    } catch (error) {
      console.error('❌ Ingress 목록 조회 실패:', error);
      return {
        success: false,
        ingresses: [],
        error: error.message
      };
    }
  }

  /**
   * Ingress 리소스 업데이트
   */
  async updateIngress(name, namespace, ingressManifest) {
    try {
      const result = await this.networkingApi.replaceNamespacedIngress(
        name,
        namespace,
        ingressManifest
      );

      console.log(`✅ Ingress 업데이트 완료: ${name}`);

      return {
        success: true,
        ingress: result.body
      };
    } catch (error) {
      console.error('❌ Ingress 업데이트 실패:', error);
      throw new Error(`Ingress 업데이트 실패: ${error.body?.message || error.message}`);
    }
  }

  /**
   * Ingress 리소스 삭제
   */
  async deleteIngress(name, namespace = 'default') {
    try {
      await this.networkingApi.deleteNamespacedIngress(name, namespace);
      console.log(`✅ Ingress 삭제 완료: ${name}`);

      return {
        success: true,
        message: 'Ingress가 성공적으로 삭제되었습니다.'
      };
    } catch (error) {
      console.error('❌ Ingress 삭제 실패:', error);
      throw new Error(`Ingress 삭제 실패: ${error.body?.message || error.message}`);
    }
  }

  /**
   * Certificate 리소스 조회 (cert-manager)
   */
  async getCertificate(name, namespace = 'default') {
    try {
      // CustomObjectsApi 사용
      const customApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
      
      const result = await customApi.getNamespacedCustomObject(
        'cert-manager.io',
        'v1',
        namespace,
        'certificates',
        name
      );

      return {
        success: true,
        certificate: result.body
      };
    } catch (error) {
      if (error.response?.statusCode === 404) {
        return {
          success: false,
          error: 'Certificate를 찾을 수 없습니다.'
        };
      }
      console.error('❌ Certificate 조회 실패:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 네임스페이스의 모든 Certificate 조회
   */
  async listCertificates(namespace = 'default') {
    try {
      const customApi = this.kc.makeApiClient(k8s.CustomObjectsApi);
      
      const result = await customApi.listNamespacedCustomObject(
        'cert-manager.io',
        'v1',
        namespace,
        'certificates'
      );

      return {
        success: true,
        certificates: result.body.items || []
      };
    } catch (error) {
      console.error('❌ Certificate 목록 조회 실패:', error);
      return {
        success: false,
        certificates: [],
        error: error.message
      };
    }
  }

  /**
   * TLS Secret 조회
   */
  async getTLSSecret(secretName, namespace = 'default') {
    try {
      const result = await this.k8sApi.readNamespacedSecret(secretName, namespace);
      
      // TLS 데이터 디코딩
      const tlsData = {
        cert: Buffer.from(result.body.data['tls.crt'], 'base64').toString('utf-8'),
        key: Buffer.from(result.body.data['tls.key'], 'base64').toString('utf-8')
      };

      return {
        success: true,
        secret: result.body,
        tlsData
      };
    } catch (error) {
      if (error.response?.statusCode === 404) {
        return {
          success: false,
          error: 'Secret을 찾을 수 없습니다.'
        };
      }
      throw error;
    }
  }

  /**
   * DB의 Ingress 규칙을 Kubernetes에 동기화
   */
  async syncIngressFromDB(ruleId) {
    try {
      // DB에서 Ingress 규칙 조회
      const result = await pool.query(`
        SELECT 
          ir.*,
          kc.cluster_name,
          tc.cert_data,
          tc.key_data
        FROM ingress_rules ir
        LEFT JOIN kubernetes_clusters kc ON ir.cluster_id = kc.id
        LEFT JOIN ingress_tls_mappings itm ON ir.id = itm.ingress_rule_id
        LEFT JOIN tls_certificates tc ON itm.certificate_id = tc.id
        WHERE ir.id = $1
      `, [ruleId]);

      if (result.rows.length === 0) {
        throw new Error('Ingress 규칙을 찾을 수 없습니다.');
      }

      const rule = result.rows[0];

      // Kubernetes Ingress 생성
      const ingressConfig = {
        name: rule.rule_name,
        namespace: rule.namespace || 'default',
        host: rule.host,
        serviceName: rule.service_name,
        servicePort: rule.service_port,
        path: rule.path || '/',
        tlsEnabled: !!rule.cert_data,
        tlsSecretName: `${rule.rule_name}-tls`,
        certIssuer: 'selfsigned-issuer', // 기본값
        annotations: rule.annotations || {}
      };

      const ingressResult = await this.createIngress(ingressConfig);

      // DB 상태 업데이트
      await pool.query(`
        UPDATE ingress_rules 
        SET status = 'active', updated_at = NOW()
        WHERE id = $1
      `, [ruleId]);

      console.log(`✅ Ingress DB 동기화 완료: ${rule.rule_name}`);

      return {
        success: true,
        ingress: ingressResult.ingress,
        message: 'Ingress가 Kubernetes에 성공적으로 생성되었습니다.'
      };
    } catch (error) {
      console.error('❌ Ingress DB 동기화 실패:', error);
      
      // DB 상태를 error로 업데이트
      await pool.query(`
        UPDATE ingress_rules 
        SET status = 'error', updated_at = NOW()
        WHERE id = $1
      `, [ruleId]);

      throw error;
    }
  }
}

// [advice from AI] 싱글톤 인스턴스 생성 및 내보내기
const kubernetesServiceInstance = new KubernetesService();
module.exports = kubernetesServiceInstance;
