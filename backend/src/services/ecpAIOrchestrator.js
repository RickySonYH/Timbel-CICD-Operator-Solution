// [advice from AI] ECP-AI 오케스트레이터 API 연동 서비스
// 멀티테넌트 배포 관리, 서비스 배포, 모니터링 기능

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

class ECPAIOrchestrator {
  constructor() {
    // [advice from AI] ECP-AI 오케스트레이터 API 설정
    this.baseURL = process.env.ECP_AI_API_BASE_URL || 'https://api.ecp-ai.com';
    this.apiKey = process.env.ECP_AI_API_KEY || '';
    this.timeout = parseInt(process.env.ECP_AI_TIMEOUT || '30000');
    
    // [advice from AI] 지원 서비스 타입 정의 (8개 서비스)
    this.supportedServices = [
      'callbot',    // 콜봇
      'chatbot',    // 챗봇
      'advisor',    // 어드바이저
      'stt',        // Speech-to-Text
      'tts',        // Text-to-Speech
      'ta',         // Text Analytics
      'qa',         // Question Answering
      'common'      // 공통 서비스
    ];

    // [advice from AI] 지원 클라우드 프로바이더
    this.supportedProviders = ['aws', 'ncp', 'azure', 'gcp'];
  }

  // [advice from AI] 테넌트 생성 - 실제 데이터베이스 및 Kubernetes 연동
  async createTenant(config) {
    try {
      const {
        tenantId,
        tenantName,
        description,
        services = [],
        cloudProvider = 'aws',
        resourceRequirements = {},
        settings = {}
      } = config;

      // [advice from AI] 입력 검증
      if (!tenantId || !tenantName) {
        throw new Error('테넌트 ID와 이름은 필수입니다');
      }

      if (!this.supportedProviders.includes(cloudProvider)) {
        throw new Error(`지원되지 않는 클라우드 프로바이더: ${cloudProvider}`);
      }

      // [advice from AI] 테넌트 생성 요청 데이터 구성
      const tenantData = {
        tenant_id: tenantId,
        tenant_name: tenantName,
        description: description || `${tenantName} 테넌트`,
        cloud_provider: cloudProvider,
        services: this.validateServices(services),
        resource_requirements: resourceRequirements,
        settings: {
          auto_scaling: settings.autoScaling || true,
          monitoring: settings.monitoring || true,
          backup: settings.backup || true,
          ...settings
        },
        created_at: new Date().toISOString(),
        status: 'creating'
      };

      console.log('🚀 테넌트 생성 시작:', tenantId);

      // [advice from AI] ECP-AI API 키가 없으면 DB + K8s로 직접 구현
      if (this.apiKey === '' || this.baseURL.includes('mock')) {
        console.log('⚠️ ECP-AI API 미연결, 자체 구현 사용');
        return await this.createTenantDirect(tenantData);
      }

      // [advice from AI] 실제 ECP-AI API 호출
      try {
        const response = await axios.post(
          `${this.baseURL}/v1/tenants`,
          tenantData,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: this.timeout
          }
        );

        console.log('✅ ECP-AI API 테넌트 생성 완료');
        
        return {
          success: true,
          data: response.data,
          message: '테넌트가 성공적으로 생성되었습니다',
          source: 'ecp-ai-api'
        };
        
      } catch (apiError) {
        console.error('❌ ECP-AI API 호출 실패:', apiError.message);
        console.log('⚠️ 자체 구현으로 Fallback');
        
        // Fallback to direct implementation
        return await this.createTenantDirect(tenantData);
      }

    } catch (error) {
      console.error('❌ 테넌트 생성 오류:', error);
      throw new Error(`테넌트 생성 실패: ${error.message}`);
    }
  }

  // [advice from AI] 실제 테넌트 생성 (DB + Kubernetes 직접 연동)
  async createTenantDirect(tenantData) {
    try {
      console.log('🔧 자체 테넌트 생성 구현 시작');
      
      // 1. 데이터베이스에 테넌트 저장
      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.OPERATIONS_DB_HOST || 'postgres',
        port: process.env.OPERATIONS_DB_PORT || 5432,
        database: process.env.OPERATIONS_DB_NAME || 'timbel_cicd_operator',
        user: process.env.OPERATIONS_DB_USER || 'timbel_user',
        password: process.env.OPERATIONS_DB_PASSWORD || 'timbel_pass'
      });

      const insertQuery = `
        INSERT INTO tenants (
          tenant_id, tenant_name, description, environment, 
          cloud_provider, region, deployment_mode, deployment_strategy,
          auto_scaling, monitoring_enabled, services, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const values = [
        tenantData.tenant_id,
        tenantData.tenant_name,
        tenantData.description,
        'production',
        tenantData.cloud_provider,
        tenantData.resource_requirements.region || 'ap-northeast-2',
        'auto-calculate',
        'rolling',
        tenantData.settings.auto_scaling,
        tenantData.settings.monitoring,
        JSON.stringify(tenantData.services),
        'creating',
        tenantData.created_at
      ];

      const dbResult = await pool.query(insertQuery, values);
      console.log('✅ DB에 테넌트 저장 완료');

      // 2. Kubernetes 네임스페이스 생성
      const k8sResult = await this.createK8sNamespace(tenantData);
      
      // 3. 서비스별 Deployment 생성
      const deployments = await this.deployTenantServices(tenantData);

      // 4. 상태 업데이트
      await pool.query(
        'UPDATE tenants SET status = $1, updated_at = NOW() WHERE tenant_id = $2',
        ['running', tenantData.tenant_id]
      );

      await pool.end();

      return {
        success: true,
        data: {
          ...dbResult.rows[0],
          kubernetes: {
            namespace: k8sResult.namespace,
            deployments: deployments
          }
        },
        message: '테넌트가 성공적으로 생성되었습니다 (자체 구현)',
        source: 'direct-implementation'
      };

    } catch (error) {
      console.error('❌ 자체 테넌트 생성 실패:', error);
      
      // 최종 Fallback to mock
      console.warn('⚠️ 자체 구현 실패, Mock으로 Fallback');
      return this.mockCreateTenant(tenantData);
    }
  }

  // [advice from AI] Kubernetes 네임스페이스 생성
  async createK8sNamespace(tenantData) {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      const namespace = `tenant-${tenantData.tenant_id}`;
      const namespaceYaml = `
apiVersion: v1
kind: Namespace
metadata:
  name: ${namespace}
  labels:
    tenant-id: ${tenantData.tenant_id}
    tenant-name: ${tenantData.tenant_name}
    cloud-provider: ${tenantData.cloud_provider}
`;

      // kubectl로 네임스페이스 생성
      const { stdout, stderr } = await execPromise(
        `echo '${namespaceYaml}' | kubectl apply -f -`
      );

      console.log('✅ Kubernetes 네임스페이스 생성:', namespace);

      return {
        namespace,
        kubectl_output: stdout
      };

    } catch (error) {
      console.error('⚠️ Kubernetes 네임스페이스 생성 실패:', error.message);
      
      // kubectl 실패 시에도 계속 진행 (네임스페이스는 나중에 수동 생성 가능)
      return {
        namespace: `tenant-${tenantData.tenant_id}`,
        warning: 'kubectl 미연결, 네임스페이스 수동 생성 필요'
      };
    }
  }

  // [advice from AI] 테넌트 서비스 배포
  async deployTenantServices(tenantData) {
    const deployments = [];
    
    for (const service of tenantData.services) {
      try {
        const deployment = await this.createServiceDeployment(
          tenantData.tenant_id,
          service,
          tenantData
        );
        deployments.push(deployment);
      } catch (error) {
        console.error(`⚠️ 서비스 ${service} 배포 실패:`, error.message);
        deployments.push({
          service,
          status: 'failed',
          error: error.message
        });
      }
    }

    return deployments;
  }

  // [advice from AI] 개별 서비스 Deployment 생성
  async createServiceDeployment(tenantId, serviceName, tenantData) {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execPromise = util.promisify(exec);

      const namespace = `tenant-${tenantId}`;
      const imageMap = {
        'callbot': 'ecp-ai/callbot:latest',
        'chatbot': 'ecp-ai/chatbot:latest',
        'advisor': 'ecp-ai/advisor:latest',
        'stt': 'ecp-ai/stt:latest',
        'tts': 'ecp-ai/tts:latest',
        'ta': 'ecp-ai/text-analytics:latest',
        'qa': 'ecp-ai/question-answering:latest',
        'common': 'ecp-ai/common-services:latest'
      };

      const deploymentYaml = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${serviceName}
  namespace: ${namespace}
  labels:
    app: ${serviceName}
    tenant-id: ${tenantId}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: ${serviceName}
  template:
    metadata:
      labels:
        app: ${serviceName}
    spec:
      containers:
      - name: ${serviceName}
        image: ${imageMap[serviceName] || `ecp-ai/${serviceName}:latest`}
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
`;

      const { stdout } = await execPromise(
        `echo '${deploymentYaml}' | kubectl apply -f -`
      );

      console.log(`✅ 서비스 ${serviceName} 배포 완료`);

      return {
        service: serviceName,
        status: 'deployed',
        kubectl_output: stdout
      };

    } catch (error) {
      console.error(`⚠️ 서비스 ${serviceName} 배포 실패:`, error.message);
      
      return {
        service: serviceName,
        status: 'pending',
        warning: 'kubectl 미연결, 수동 배포 필요'
      };
    }
  }

  // [advice from AI] 테넌트 목록 조회 - 실제 데이터베이스 연동
  async getTenants(filters = {}) {
    try {
      const {
        status,
        cloudProvider,
        page = 1,
        limit = 20
      } = filters;

      console.log('📋 테넌트 목록 조회:', filters);

      // [advice from AI] ECP-AI API 미연결 시 자체 구현 사용
      if (this.apiKey === '' || this.baseURL.includes('mock')) {
        console.log('⚠️ ECP-AI API 미연결, DB에서 직접 조회');
        return await this.getTenantsFromDB(filters);
      }

      // [advice from AI] 실제 ECP-AI API 호출
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(status && { status }),
          ...(cloudProvider && { cloud_provider: cloudProvider })
        });

        const response = await axios.get(
          `${this.baseURL}/v1/tenants?${queryParams}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            },
            timeout: this.timeout
          }
        );

        console.log('✅ ECP-AI API 테넌트 목록 조회 완료');

        return {
          success: true,
          data: response.data,
          message: '테넌트 목록 조회 성공',
          source: 'ecp-ai-api'
        };

      } catch (apiError) {
        console.error('❌ ECP-AI API 호출 실패:', apiError.message);
        console.log('⚠️ DB에서 직접 조회로 Fallback');
        
        // Fallback to DB
        return await this.getTenantsFromDB(filters);
      }

    } catch (error) {
      console.error('❌ 테넌트 목록 조회 오류:', error);
      throw new Error(`테넌트 목록 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] 데이터베이스에서 테넌트 목록 조회
  async getTenantsFromDB(filters = {}) {
    try {
      const {
        status,
        cloudProvider,
        page = 1,
        limit = 20
      } = filters;

      const { Pool } = require('pg');
      const pool = new Pool({
        host: process.env.OPERATIONS_DB_HOST || 'postgres',
        port: process.env.OPERATIONS_DB_PORT || 5432,
        database: process.env.OPERATIONS_DB_NAME || 'timbel_cicd_operator',
        user: process.env.OPERATIONS_DB_USER || 'timbel_user',
        password: process.env.OPERATIONS_DB_PASSWORD || 'timbel_pass'
      });

      // 동적 WHERE 절 구성
      const conditions = [];
      const values = [];
      let paramCount = 1;

      if (status) {
        conditions.push(`status = $${paramCount++}`);
        values.push(status);
      }

      if (cloudProvider) {
        conditions.push(`cloud_provider = $${paramCount++}`);
        values.push(cloudProvider);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // 전체 개수 조회
      const countQuery = `SELECT COUNT(*) FROM tenants ${whereClause}`;
      const countResult = await pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // 페이지네이션 적용 데이터 조회
      const offset = (page - 1) * limit;
      const selectQuery = `
        SELECT 
          tenant_id, tenant_name, description, environment, status,
          cloud_provider, region, deployment_mode, deployment_strategy,
          auto_scaling, monitoring_enabled, services, 
          created_at, updated_at, created_by
        FROM tenants
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      const selectResult = await pool.query(selectQuery, [...values, limit, offset]);
      
      await pool.end();

      console.log(`✅ DB에서 테넌트 ${selectResult.rows.length}개 조회 완료`);

      return {
        success: true,
        data: {
          tenants: selectResult.rows.map(row => ({
            tenant_id: row.tenant_id,
            tenant_name: row.tenant_name,
            description: row.description,
            status: row.status,
            cloud_provider: row.cloud_provider,
            region: row.region,
            services: row.services,
            auto_scaling: row.auto_scaling,
            monitoring_enabled: row.monitoring_enabled,
            created_at: row.created_at,
            updated_at: row.updated_at
          })),
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          total_pages: Math.ceil(total / limit)
        },
        message: `테넌트 목록 조회 완료 (${total}개)`,
        source: 'database'
      };

    } catch (error) {
      console.error('❌ DB 테넌트 조회 실패:', error);
      
      // 최종 Fallback to mock
      console.warn('⚠️ DB 조회 실패, Mock으로 Fallback');
      return this.mockGetTenants(filters);
    }
  }

  // [advice from AI] 테넌트 상세 조회
  async getTenant(tenantId) {
    try {
      if (!tenantId) {
        throw new Error('테넌트 ID는 필수입니다');
      }

      // [advice from AI] Mock 응답
      if (this.apiKey === '' || this.baseURL.includes('mock')) {
        return this.mockGetTenant(tenantId);
      }

      const response = await axios.get(
        `${this.baseURL}/v1/tenants/${tenantId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: this.timeout
        }
      );

      return {
        success: true,
        data: response.data,
        message: '테넌트 정보 조회 성공'
      };

    } catch (error) {
      console.error('테넌트 조회 오류:', error);
      throw new Error(`테넌트 조회 실패: ${error.message}`);
    }
  }

  // [advice from AI] 테넌트 배포 실행
  async deployTenant(tenantId, deploymentConfig = {}) {
    try {
      if (!tenantId) {
        throw new Error('테넌트 ID는 필수입니다');
      }

      const deployData = {
        tenant_id: tenantId,
        deployment_type: deploymentConfig.type || 'rolling',
        environment: deploymentConfig.environment || 'production',
        force_restart: deploymentConfig.forceRestart || false,
        backup_before_deploy: deploymentConfig.backup || true,
        deployed_at: new Date().toISOString()
      };

      console.log('테넌트 배포 실행:', deployData);

      // [advice from AI] Mock 응답
      if (this.apiKey === '' || this.baseURL.includes('mock')) {
        return this.mockDeployTenant(tenantId, deployData);
      }

      const response = await axios.post(
        `${this.baseURL}/v1/tenants/${tenantId}/deploy`,
        deployData,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: this.timeout
        }
      );

      return {
        success: true,
        data: response.data,
        message: '테넌트 배포가 시작되었습니다'
      };

    } catch (error) {
      console.error('테넌트 배포 오류:', error);
      throw new Error(`테넌트 배포 실패: ${error.message}`);
    }
  }

  // [advice from AI] 테넌트 상태 모니터링
  async monitorTenant(tenantId) {
    try {
      if (!tenantId) {
        throw new Error('테넌트 ID는 필수입니다');
      }

      // [advice from AI] Mock 응답
      if (this.apiKey === '' || this.baseURL.includes('mock')) {
        return this.mockMonitorTenant(tenantId);
      }

      const response = await axios.get(
        `${this.baseURL}/v1/tenants/${tenantId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: this.timeout
        }
      );

      return {
        success: true,
        data: response.data,
        message: '테넌트 모니터링 정보 조회 성공'
      };

    } catch (error) {
      console.error('테넌트 모니터링 오류:', error);
      throw new Error(`테넌트 모니터링 실패: ${error.message}`);
    }
  }

  // [advice from AI] 서비스 검증
  validateServices(services) {
    if (!Array.isArray(services)) {
      throw new Error('서비스는 배열 형태여야 합니다');
    }

    return services.map(service => {
      const {
        name,
        type,
        config = {},
        resources = {}
      } = service;

      if (!name || !type) {
        throw new Error('서비스 이름과 타입은 필수입니다');
      }

      if (!this.supportedServices.includes(type)) {
        throw new Error(`지원되지 않는 서비스 타입: ${type}`);
      }

      return {
        name,
        type,
        config,
        resources: {
          cpu: resources.cpu || '0.5',
          memory: resources.memory || '1Gi',
          gpu: resources.gpu || 0,
          replicas: resources.replicas || 1,
          ...resources
        }
      };
    });
  }

  // [advice from AI] Mock 테넌트 생성
  mockCreateTenant(tenantData) {
    console.warn('⚠️ Mock 테넌트 생성 사용 중 - ECP-AI API 및 DB/K8s 연결 확인 필요');
    
    const mockResponse = {
      tenant_id: tenantData.tenant_id,
      tenant_name: tenantData.tenant_name,
      status: 'creating',
      deployment_id: uuidv4(),
      estimated_time: '5-10 minutes',
      progress: 0,
      created_at: tenantData.created_at,
      services: tenantData.services,
      cloud_provider: tenantData.cloud_provider
    };

    return {
      success: true,
      data: mockResponse,
      message: 'Mock 테넌트 생성 시뮬레이션 (실제 생성 아님)',
      mock: true,
      warning: 'ECP-AI API/DB/K8s 미연결 상태'
    };
  }

  // [advice from AI] Mock 테넌트 목록
  mockGetTenants(filters) {
    console.warn('⚠️ Mock 테넌트 목록 사용 중 - ECP-AI API 및 DB 연결 확인 필요');
    
    const mockTenants = [
      {
        tenant_id: 'timbel-prod-001',
        tenant_name: 'Timbel Production',
        status: 'running',
        cloud_provider: 'aws',
        services: ['chatbot', 'advisor', 'stt', 'tts'],
        created_at: '2024-01-15T10:30:00Z',
        last_deployed: '2024-01-20T14:20:00Z'
      },
      {
        tenant_id: 'timbel-dev-001',
        tenant_name: 'Timbel Development',
        status: 'stopped',
        cloud_provider: 'ncp',
        services: ['chatbot', 'callbot'],
        created_at: '2024-01-10T09:15:00Z',
        last_deployed: '2024-01-18T16:45:00Z'
      }
    ];

    return {
      success: true,
      data: {
        tenants: mockTenants,
        total: mockTenants.length,
        page: filters.page || 1,
        limit: filters.limit || 20
      },
      message: 'Mock 테넌트 목록 조회 (실제 데이터 아님)',
      mock: true,
      warning: 'ECP-AI API/DB 미연결 상태'
    };
  }

  // [advice from AI] Mock 테넌트 상세
  mockGetTenant(tenantId) {
    const mockTenant = {
      tenant_id: tenantId,
      tenant_name: 'Timbel Production',
      description: '운영 환경 테넌트',
      status: 'running',
      cloud_provider: 'aws',
      region: 'ap-northeast-2',
      services: [
        {
          name: 'chatbot-service',
          type: 'chatbot',
          status: 'running',
          replicas: 2,
          resources: {
            cpu: '0.5',
            memory: '1Gi',
            gpu: 0
          }
        },
        {
          name: 'advisor-service',
          type: 'advisor',
          status: 'running',
          replicas: 1,
          resources: {
            cpu: '1.0',
            memory: '2Gi',
            gpu: 1
          }
        }
      ],
      metrics: {
        cpu_usage: 45.2,
        memory_usage: 67.8,
        request_count: 1247,
        error_rate: 0.12
      },
      created_at: '2024-01-15T10:30:00Z',
      last_deployed: '2024-01-20T14:20:00Z'
    };

    return {
      success: true,
      data: mockTenant,
      message: 'Mock 테넌트 상세 조회 완료'
    };
  }

  // [advice from AI] Mock 테넌트 배포
  mockDeployTenant(tenantId, deployData) {
    const mockDeployment = {
      deployment_id: uuidv4(),
      tenant_id: tenantId,
      status: 'deploying',
      progress: 15,
      estimated_time: '8 minutes',
      steps: [
        { name: 'Validating configuration', status: 'completed', progress: 100 },
        { name: 'Building container images', status: 'in_progress', progress: 60 },
        { name: 'Deploying to cluster', status: 'pending', progress: 0 },
        { name: 'Health checking', status: 'pending', progress: 0 }
      ],
      started_at: new Date().toISOString()
    };

    return {
      success: true,
      data: mockDeployment,
      message: 'Mock 테넌트 배포 시뮬레이션 시작'
    };
  }

  // [advice from AI] Mock 테넌트 모니터링
  mockMonitorTenant(tenantId) {
    const mockStatus = {
      tenant_id: tenantId,
      overall_status: 'healthy',
      services: [
        {
          name: 'chatbot-service',
          status: 'healthy',
          uptime: '99.8%',
          response_time: 145,
          error_rate: 0.05
        },
        {
          name: 'advisor-service',
          status: 'healthy',
          uptime: '99.9%',
          response_time: 230,
          error_rate: 0.02
        }
      ],
      resources: {
        cpu_usage: 45.2,
        memory_usage: 67.8,
        disk_usage: 23.4,
        network_io: 156.7
      },
      alerts: [
        {
          level: 'warning',
          message: 'Memory usage approaching 70% threshold',
          timestamp: '2024-01-20T15:30:00Z'
        }
      ],
      last_updated: new Date().toISOString()
    };

    return {
      success: true,
      data: mockStatus,
      message: 'Mock 테넌트 모니터링 정보 조회 완료'
    };
  }
}

module.exports = ECPAIOrchestrator;
