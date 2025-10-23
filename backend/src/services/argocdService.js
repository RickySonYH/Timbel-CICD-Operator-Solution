// [advice from AI] ArgoCD 서비스 클래스 - 실제 ArgoCD API 연동
const axios = require('axios');
const { Pool } = require('pg');

class ArgoCDService {
  constructor() {
    this.pool = new Pool({
      user: 'timbel_user',
      host: 'postgres',
      database: 'timbel_cicd_operator',
      password: 'timbel_password',
      port: 5432,
    });
    
    this.config = null;
    this.lastConfigUpdate = null;
  }

  // [advice from AI] ArgoCD 설정 로드
  async loadConfig() {
    try {
      const now = Date.now();
      
      // 설정이 최신이면 캐시된 설정 사용
      if (this.config && this.lastConfigUpdate && (now - this.lastConfigUpdate) < 30000) {
        return this.config;
      }

      const result = await this.pool.query(`
        SELECT config_key, config_value, is_sensitive
        FROM system_configurations 
        WHERE category = 'argocd'
      `);

      const config = {};
      result.rows.forEach(row => {
        config[row.config_key] = row.config_value;
      });

      // ArgoCD 활성화 확인
      if (config.argocd_enabled !== 'true') {
        throw new Error('ArgoCD 서버가 비활성화되어 있습니다.');
      }

      this.config = config;
      this.lastConfigUpdate = now;
      
      console.log('✅ ArgoCD 설정 로드 완료:', {
        url: config.argocd_url,
        username: config.argocd_username,
        enabled: config.argocd_enabled
      });
      
      return config;
    } catch (error) {
      console.error('❌ ArgoCD 설정 로드 실패:', error.message);
      throw error;
    }
  }

  // [advice from AI] ArgoCD API 요청 헬퍼
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const config = await this.loadConfig();
      
      const url = `${config.argocd_url}${endpoint}`;
      const auth = {
        username: config.argocd_username,
        password: config.argocd_password
      };

      const options = {
        method,
        url,
        auth,
        timeout: parseInt(config.argocd_timeout) || 30000,
        headers: {
          'Content-Type': 'application/json'
        },
        // SSL 검증 비활성화 (self-signed certificate 문제 해결)
        httpsAgent: new (require('https').Agent)({
          rejectUnauthorized: false
        })
      };

      if (data) {
        options.data = data;
      }

      console.log(`🔗 ArgoCD API 요청: ${method} ${url}`);
      const response = await axios(options);
      
      console.log(`✅ ArgoCD API 응답: ${response.status}`);
      return response.data;
    } catch (error) {
      console.error('❌ ArgoCD API 요청 실패:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url
      });
      throw error;
    }
  }

  // [advice from AI] ArgoCD 서버 상태 확인
  async checkHealth() {
    try {
      const data = await this.makeRequest('/api/version');
      
      // ArgoCD 버전 정보 가져오기
      let version = 'Unknown';
      if (data.Version) {
        version = data.Version;
      }
      
      // 애플리케이션 개수 확인
      let applications_count = 0;
      try {
        const appsData = await this.makeRequest('/api/applications');
        applications_count = appsData.items?.length || 0;
      } catch (appsError) {
        console.log('⚠️ ArgoCD 애플리케이션 개수 조회 실패:', appsError.message);
      }
      
      return {
        status: 'connected',
        version: version,
        applications_count: applications_count,
        last_check: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'disconnected',
        error: error.message,
        last_check: new Date().toISOString()
      };
    }
  }

  // [advice from AI] ArgoCD 애플리케이션 목록 조회
  async listApplications() {
    try {
      const data = await this.makeRequest('/api/v1/applications');
      
      const applications = data.items?.map(app => ({
        name: app.metadata.name,
        namespace: app.metadata.namespace,
        status: app.status.sync.status,
        health: app.status.health.status,
        repository: app.spec.source.repoURL,
        path: app.spec.source.path,
        destination_namespace: app.spec.destination.namespace,
        destination_server: app.spec.destination.server,
        last_sync: app.status.sync.finishedAt,
        created_at: app.metadata.creationTimestamp
      })) || [];
      
      return {
        success: true,
        applications,
        total: applications.length,
        message: 'ArgoCD 애플리케이션 목록 조회 완료'
      };
    } catch (error) {
      console.error('ArgoCD 애플리케이션 목록 조회 실패:', error.message);
      return { success: false, error: `ArgoCD 애플리케이션 목록 조회 실패: ${error.message}` };
    }
  }

  // [advice from AI] ArgoCD 애플리케이션 생성
  async createApplication(name, appConfig) {
    try {
      const { repository_url, path, destination_namespace, destination_server } = appConfig;
      
      const applicationData = {
        metadata: {
          name: name,
          namespace: 'argocd'
        },
        spec: {
          project: 'default',
          source: {
            repoURL: repository_url,
            path: path,
            targetRevision: 'HEAD'
          },
          destination: {
            server: destination_server,
            namespace: destination_namespace
          },
          syncPolicy: {
            automated: {
              prune: true,
              selfHeal: true
            }
          }
        }
      };

      await this.makeRequest('/api/v1/applications', 'POST', applicationData);
      
      return {
        success: true,
        application_name: name,
        message: `ArgoCD 애플리케이션 '${name}' 생성 완료`
      };
    } catch (error) {
      console.error('ArgoCD 애플리케이션 생성 실패:', error.message);
      return { success: false, error: `ArgoCD 애플리케이션 생성 실패: ${error.message}` };
    }
  }

  // [advice from AI] ArgoCD 애플리케이션 동기화
  async syncApplication(applicationName) {
    try {
      const syncData = {
        prune: true,
        dryRun: false,
        strategy: {
          apply: {
            force: true
          }
        }
      };

      await this.makeRequest(`/api/v1/applications/${applicationName}/sync`, 'POST', syncData);
      
      return {
        success: true,
        message: `ArgoCD 애플리케이션 '${applicationName}' 동기화 완료`
      };
    } catch (error) {
      console.error('ArgoCD 애플리케이션 동기화 실패:', error.message);
      return { success: false, error: `ArgoCD 애플리케이션 동기화 실패: ${error.message}` };
    }
  }

  // [advice from AI] ArgoCD 애플리케이션 삭제
  async deleteApplication(applicationName) {
    try {
      await this.makeRequest(`/api/v1/applications/${applicationName}`, 'DELETE');
      
      return {
        success: true,
        message: `ArgoCD 애플리케이션 '${applicationName}' 삭제 완료`
      };
    } catch (error) {
      console.error('ArgoCD 애플리케이션 삭제 실패:', error.message);
      return { success: false, error: `ArgoCD 애플리케이션 삭제 실패: ${error.message}` };
    }
  }
}

module.exports = new ArgoCDService();
