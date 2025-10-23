// [advice from AI] Nexus 서비스 클래스 - 실제 Nexus API 연동
const axios = require('axios');
const { Pool } = require('pg');

class NexusService {
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

  // [advice from AI] Nexus 설정 로드
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
        WHERE category = 'nexus'
      `);

      const config = {};
      result.rows.forEach(row => {
        config[row.config_key] = row.config_value;
      });

      // Nexus 활성화 확인
      if (config.nexus_enabled !== 'true') {
        throw new Error('Nexus 서버가 비활성화되어 있습니다.');
      }

      this.config = config;
      this.lastConfigUpdate = now;
      
      console.log('✅ Nexus 설정 로드 완료:', {
        url: config.nexus_url,
        username: config.nexus_username,
        enabled: config.nexus_enabled
      });
      
      return config;
    } catch (error) {
      console.error('❌ Nexus 설정 로드 실패:', error.message);
      throw error;
    }
  }

  // [advice from AI] Nexus API 요청 헬퍼
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const config = await this.loadConfig();
      
      const url = `${config.nexus_url}${endpoint}`;
      const auth = {
        username: config.nexus_username,
        password: config.nexus_password
      };

      const options = {
        method,
        url,
        auth,
        timeout: parseInt(config.nexus_timeout) || 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        options.data = data;
      }

      console.log(`🔗 Nexus API 요청: ${method} ${url}`);
      const response = await axios(options);
      
      console.log(`✅ Nexus API 응답: ${response.status}`);
      return response.data;
    } catch (error) {
      console.error('❌ Nexus API 요청 실패:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url
      });
      throw error;
    }
  }

  // [advice from AI] Nexus 서버 상태 확인
  async checkHealth() {
    try {
      const data = await this.makeRequest('/service/rest/v1/status');
      
      // Nexus 버전 정보 가져오기
      let version = 'Unknown';
      if (data.version) {
        version = data.version;
      }
      
      // 저장소 개수 확인
      let repositories_count = 0;
      try {
        const reposData = await this.makeRequest('/service/rest/v1/repositories');
        repositories_count = reposData.length || 0;
      } catch (reposError) {
        console.log('⚠️ Nexus 저장소 개수 조회 실패:', reposError.message);
      }
      
      return {
        status: 'connected',
        version: version,
        repositories_count: repositories_count,
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

  // [advice from AI] Nexus 저장소 목록 조회
  async listRepositories() {
    try {
      const data = await this.makeRequest('/service/rest/v1/repositories');
      
      const repositories = data.map(repo => ({
        name: repo.name,
        type: repo.type,
        format: repo.format,
        url: repo.url,
        online: repo.online,
        attributes: repo.attributes
      }));
      
      return {
        success: true,
        repositories,
        total: repositories.length,
        message: 'Nexus 저장소 목록 조회 완료'
      };
    } catch (error) {
      console.error('Nexus 저장소 목록 조회 실패:', error.message);
      return { success: false, error: `Nexus 저장소 목록 조회 실패: ${error.message}` };
    }
  }

  // [advice from AI] Nexus 컴포넌트 목록 조회
  async listComponents() {
    try {
      const data = await this.makeRequest('/service/rest/v1/components');
      
      const components = data.items?.map(component => ({
        id: component.id,
        repository: component.repository,
        format: component.format,
        group: component.group,
        name: component.name,
        version: component.version,
        created: component.created,
        last_modified: component.lastModified
      })) || [];
      
      return {
        success: true,
        components,
        total: components.length,
        message: 'Nexus 컴포넌트 목록 조회 완료'
      };
    } catch (error) {
      console.error('Nexus 컴포넌트 목록 조회 실패:', error.message);
      return { success: false, error: `Nexus 컴포넌트 목록 조회 실패: ${error.message}` };
    }
  }

  // [advice from AI] Nexus 저장소 생성
  async createRepository(name, repoConfig) {
    try {
      const { type, format, version_policy } = repoConfig;
      
      const repositoryData = {
        name: name,
        online: true,
        storage: {
          blobStoreName: 'default',
          strictContentTypeValidation: true
        },
        format: format,
        type: type
      };

      // Maven2 형식인 경우 추가 설정
      if (format === 'maven2') {
        repositoryData.maven = {
          versionPolicy: version_policy,
          layoutPolicy: 'STRICT'
        };
      }

      await this.makeRequest('/service/rest/v1/repositories/maven/hosted', 'POST', repositoryData);
      
      return {
        success: true,
        repository_name: name,
        message: `Nexus 저장소 '${name}' 생성 완료`
      };
    } catch (error) {
      console.error('Nexus 저장소 생성 실패:', error.message);
      return { success: false, error: `Nexus 저장소 생성 실패: ${error.message}` };
    }
  }

  // [advice from AI] Nexus 저장소 삭제
  async deleteRepository(repositoryName) {
    try {
      await this.makeRequest(`/service/rest/v1/repositories/${repositoryName}`, 'DELETE');
      
      return {
        success: true,
        message: `Nexus 저장소 '${repositoryName}' 삭제 완료`
      };
    } catch (error) {
      console.error('Nexus 저장소 삭제 실패:', error.message);
      return { success: false, error: `Nexus 저장소 삭제 실패: ${error.message}` };
    }
  }
}

module.exports = new NexusService();
